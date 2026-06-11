import React from 'react';
import './AdBanner.css';

interface AdBannerProps {
  type: 'vertical' | 'horizontal';
  fallbackText?: string;
  adSlotId?: string; // Optional real ad unit id from network
}

export const AdBanner: React.FC<AdBannerProps> = ({ type, fallbackText = 'Sponsor Ad', adSlotId }) => {
  // --- PRODUCTION INTEGRATION GUIDE ---
  // If you are using Google AdSense, you can implement the script loading:
  //
  // useEffect(() => {
  //   try {
  //     // @ts-ignore
  //     (window.adsbygoogle = window.adsbygoogle || []).push({});
  //   } catch (e) {
  //     console.error("AdSense error:", e);
  //   }
  // }, []);
  //
  // And render:
  // <ins className="adsbygoogle"
  //      style={{ display: 'block' }}
  //      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  //      data-ad-slot={adSlotId}
  //      data-ad-format="auto"
  //      data-full-width-responsive="true"></ins>
  //
  // If using AdinPlay or Playwire, you'll inject their div script container.
  
  const isProd = import.meta.env.PROD && adSlotId;

  if (isProd) {
    return (
      <div className={`ad-banner-${type}`}>
        {/* Real Ad Container */}
        <div style={{ fontSize: '0.6rem', color: '#4b5563', textAlign: 'center' }}>ADVERTISEMENT</div>
        <div id={`ad-slot-${adSlotId}`} style={{ width: '100%', height: '100%' }}>
          {/* Ad network script injection container */}
        </div>
      </div>
    );
  }

  // --- MOCK AD BANNERS FOR DEVELOPMENT / PRE-PRODUCTION ---
  if (type === 'vertical') {
    return (
      <div className="ad-banner-vertical glass-panel">
        <span className="ad-label">ADVERTISEMENT</span>
        
        <div className="ad-mock-art">
          <span className="ad-mock-art-icon">🛸</span>
          <div className="ad-mock-art-text">{fallbackText}</div>
          <div className="ad-mock-art-desc">Support our developers by visiting our sponsors.</div>
        </div>

        <button className="ad-btn" onClick={() => window.open('https://github.com', '_blank')}>
          Sponsor Us
        </button>
      </div>
    );
  }

  return (
    <div className="ad-banner-horizontal glass-panel">
      <span className="ad-label">AD</span>
      
      <div className="ad-mock-art">
        <span className="ad-mock-art-icon">⚔️</span>
        <div style={{ textAlign: 'left' }}>
          <div className="ad-mock-art-text">{fallbackText}</div>
          <div className="ad-mock-art-desc">Train your beasts, conquer the boards, and challenge rivals online!</div>
        </div>
      </div>

      <button className="ad-btn" onClick={() => window.open('https://github.com', '_blank')} style={{ width: 'auto' }}>
        Sponsor Game
      </button>
    </div>
  );
};
export default AdBanner;
