import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export function usePushNotifications() {
  const { token } = useAuthStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    }
    throw new Error('Service Worker not supported');
  };

  const subscribe = async () => {
    if (!isSupported || !token) return false;
    
    setLoading(true);
    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        console.log('Notification permission denied');
        setLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const { data: { publicKey } } = await axios.get(`${API_BASE}/push/vapid-public-key`);
      
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send subscription to server
      await axios.post(`${API_BASE}/push/subscribe`, subscription.toJSON(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsSubscribed(true);
      console.log('Push notification subscribed successfully');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!token) return false;
    
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Remove from server
        await axios.post(`${API_BASE}/push/unsubscribe`, {
          endpoint: subscription.endpoint
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
