/**
 * Dexter - Main Entry Point
 * Orbital Visualization Engine for Orbital Sentinel
 */

import { Dexter } from './index';

// Initialize Dexter when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDexter);
} else {
  initDexter();
}

async function initDexter() {
  try {
    const dexter = Dexter.getInstance();
    dexter.init({
      isPreventDefaultHtml: false,
      isShowSplashScreen: true,
    });

    await dexter.run();

    console.log('🚀 Dexter initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Dexter:', error);
  }
}

// Make Dexter available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).Dexter = Dexter;
}

// Made with Bob
