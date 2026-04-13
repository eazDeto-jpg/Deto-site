/**
 * Detailer Tracking System
 * Handles GPS tracking, location updates, and session management
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Tracking Manager Class
 */
export class TrackingManager {
  constructor(detailerId, bookingId) {
    this.detailerId = detailerId;
    this.bookingId = bookingId;
    this.sessionId = null;
    this.isTracking = false;
    this.watchId = null;
    this.locationUpdateInterval = 10000; // 10 seconds
    this.lastLocation = null;
    this.totalDistance = 0;
    this.startTime = null;
  }

  /**
   * Start tracking session
   */
  async startTracking() {
    try {
      // Create tracking session
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert({
          detailer_id: this.detailerId,
          booking_id: this.bookingId,
          status: 'started',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      this.sessionId = data.id;
      this.isTracking = true;
      this.startTime = new Date();

      // Start GPS tracking
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      console.log('✅ Tracking started:', this.sessionId);
      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle location update from GPS
   */
  async handleLocationUpdate(position) {
    try {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;

      // Calculate distance from last location
      if (this.lastLocation) {
        const distance = this.calculateDistance(
          this.lastLocation.latitude,
          this.lastLocation.longitude,
          latitude,
          longitude
        );
        this.totalDistance += distance;
      }

      this.lastLocation = { latitude, longitude };

      // Save location to database
      const { error } = await supabase
        .from('detailer_locations')
        .insert({
          detailer_id: this.detailerId,
          booking_id: this.bookingId,
          latitude,
          longitude,
          accuracy,
          speed: speed ? speed * 3.6 : 0, // Convert m/s to km/h
          heading,
          is_tracking: true,
          started_at: this.startTime.toISOString()
        });

      if (error) throw error;

      // Emit location update event
      this.dispatchEvent('locationUpdated', {
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        totalDistance: this.totalDistance
      });

      console.log(`📍 Location updated: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  }

  /**
   * Handle GPS errors
   */
  handleLocationError(error) {
    console.error('❌ GPS Error:', error);
    
    let message = 'GPS error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'GPS permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'GPS position unavailable';
        break;
      case error.TIMEOUT:
        message = 'GPS timeout';
        break;
    }

    this.dispatchEvent('locationError', { message });
  }

  /**
   * Stop tracking session
   */
  async stopTracking() {
    try {
      // Stop GPS watching
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
      }

      this.isTracking = false;

      // Update session status
      const { error } = await supabase
        .from('tracking_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', this.sessionId);

      if (error) throw error;

      // Update all locations to stopped
      await supabase
        .from('detailer_locations')
        .update({ is_tracking: false, ended_at: new Date().toISOString() })
        .eq('booking_id', this.bookingId);

      console.log('✅ Tracking stopped');
      return { success: true };
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause tracking (temporarily)
   */
  async pauseTracking() {
    try {
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
      }

      const { error } = await supabase
        .from('tracking_sessions')
        .update({ status: 'paused' })
        .eq('id', this.sessionId);

      if (error) throw error;

      this.isTracking = false;
      console.log('⏸️ Tracking paused');
      return { success: true };
    } catch (error) {
      console.error('❌ Error pausing tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume tracking
   */
  async resumeTracking() {
    try {
      const { error } = await supabase
        .from('tracking_sessions')
        .update({ status: 'started' })
        .eq('id', this.sessionId);

      if (error) throw error;

      this.isTracking = true;
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      console.log('▶️ Tracking resumed');
      return { success: true };
    } catch (error) {
      console.error('❌ Error resuming tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get current session stats
   */
  async getSessionStats() {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('id', this.sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error getting session stats:', error);
      return null;
    }
  }

  /**
   * Dispatch custom events
   */
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Subscribe to location updates in real-time
   */
  subscribeToLocationUpdates(callback) {
    return supabase
      .from(`detailer_locations:booking_id=eq.${this.bookingId}`)
      .on('*', payload => {
        callback(payload);
      })
      .subscribe();
  }
}

/**
 * Detailer Tracking UI Component
 */
export class DetailerTrackingUI {
  constructor(containerId, detailerId, bookingId) {
    this.container = document.getElementById(containerId);
    this.tracking = new TrackingManager(detailerId, bookingId);
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="tracking-container">
        <div class="tracking-header">
          <h2>Tracking Service</h2>
          <span class="status-badge" id="statusBadge">Ready</span>
        </div>

        <div class="tracking-stats">
          <div class="stat">
            <label>Distance</label>
            <span id="distanceValue">0.0 km</span>
          </div>
          <div class="stat">
            <label>Duration</label>
            <span id="durationValue">00:00</span>
          </div>
          <div class="stat">
            <label>Avg Speed</label>
            <span id="speedValue">0 km/h</span>
          </div>
        </div>

        <div class="tracking-location">
          <div id="locationStatus">Waiting for GPS...</div>
          <div id="coordinates">
            <p>Latitude: <span id="latValue">--</span></p>
            <p>Longitude: <span id="lonValue">--</span></p>
            <p>Accuracy: <span id="accValue">--</span></p>
          </div>
        </div>

        <div class="tracking-controls">
          <button id="startBtn" class="btn btn-primary">Start Tracking</button>
          <button id="pauseBtn" class="btn btn-warning" disabled>Pause</button>
          <button id="stopBtn" class="btn btn-danger" disabled>Stop</button>
        </div>

        <div class="tracking-messages" id="messages"></div>
      </div>

      <style>
        .tracking-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin: 20px auto;
        }

        .tracking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 15px;
        }

        .tracking-header h2 {
          margin: 0;
          color: #333;
        }

        .status-badge {
          background: #6bcf7f;
          color: white;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }

        .status-badge.active {
          background: #667eea;
        }

        .status-badge.paused {
          background: #ffd93d;
        }

        .status-badge.stopped {
          background: #ff6b6b;
        }

        .tracking-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .stat label {
          display: block;
          font-size: 12px;
          color: #999;
          margin-bottom: 5px;
          font-weight: 600;
        }

        .stat span {
          display: block;
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
        }

        .tracking-location {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        #locationStatus {
          color: #666;
          margin-bottom: 10px;
          font-size: 14px;
        }

        #coordinates p {
          margin: 5px 0;
          font-size: 12px;
          color: #666;
        }

        #coordinates span {
          font-weight: bold;
          color: #333;
          font-family: monospace;
        }

        .tracking-controls {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .btn {
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-warning {
          background: #ffd93d;
          color: #333;
        }

        .btn-warning:hover:not(:disabled) {
          background: #ffcf1f;
        }

        .btn-danger {
          background: #ff6b6b;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #ff5252;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tracking-messages {
          background: #f0f7ff;
          border-left: 4px solid #667eea;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          color: #333;
          max-height: 150px;
          overflow-y: auto;
        }

        .message {
          padding: 5px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .message:last-child {
          border-bottom: none;
        }

        .message.success {
          color: #6bcf7f;
        }

        .message.error {
          color: #ff6b6b;
        }
      </style>
    `;
  }

  attachEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    startBtn.addEventListener('click', () => this.handleStart());
    pauseBtn.addEventListener('click', () => this.handlePause());
    stopBtn.addEventListener('click', () => this.handleStop());

    // Listen to tracking events
    window.addEventListener('locationUpdated', (e) => this.updateUI(e.detail));
    window.addEventListener('locationError', (e) => this.showMessage(e.detail.message, 'error'));
  }

  async handleStart() {
    const result = await this.tracking.startTracking();
    if (result.success) {
      this.showMessage('✅ Tracking started', 'success');
      document.getElementById('startBtn').disabled = true;
      document.getElementById('pauseBtn').disabled = false;
      document.getElementById('stopBtn').disabled = false;
      document.getElementById('statusBadge').textContent = 'Tracking';
      document.getElementById('statusBadge').className = 'status-badge active';
    } else {
      this.showMessage(`❌ Error: ${result.error}`, 'error');
    }
  }

  async handlePause() {
    const result = await this.tracking.pauseTracking();
    if (result.success) {
      this.showMessage('⏸️ Tracking paused', 'success');
      document.getElementById('pauseBtn').textContent = 'Resume';
      document.getElementById('pauseBtn').onclick = () => this.handleResume();
      document.getElementById('statusBadge').textContent = 'Paused';
      document.getElementById('statusBadge').className = 'status-badge paused';
    }
  }

  async handleResume() {
    const result = await this.tracking.resumeTracking();
    if (result.success) {
      this.showMessage('▶️ Tracking resumed', 'success');
      document.getElementById('pauseBtn').textContent = 'Pause';
      document.getElementById('pauseBtn').onclick = () => this.handlePause();
      document.getElementById('statusBadge').textContent = 'Tracking';
      document.getElementById('statusBadge').className = 'status-badge active';
    }
  }

  async handleStop() {
    const result = await this.tracking.stopTracking();
    if (result.success) {
      this.showMessage('✅ Tracking stopped', 'success');
      document.getElementById('startBtn').disabled = false;
      document.getElementById('pauseBtn').disabled = true;
      document.getElementById('stopBtn').disabled = true;
      document.getElementById('statusBadge').textContent = 'Completed';
      document.getElementById('statusBadge').className = 'status-badge stopped';
    }
  }

  updateUI(data) {
    document.getElementById('latValue').textContent = data.latitude.toFixed(6);
    document.getElementById('lonValue').textContent = data.longitude.toFixed(6);
    document.getElementById('accValue').textContent = `${data.accuracy.toFixed(1)}m`;
    document.getElementById('distanceValue').textContent = `${data.totalDistance.toFixed(2)} km`;
    document.getElementById('locationStatus').textContent = `📍 Live location (${new Date().toLocaleTimeString()})`;
  }

  showMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Auto-remove after 5 seconds
    setTimeout(() => messageEl.remove(), 5000);
  }
}

export default { TrackingManager, DetailerTrackingUI };
