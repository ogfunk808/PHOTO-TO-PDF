export class PrivacyManager {
  static init() {
    this.setupNetworkStatusListener();
  }

  static setupNetworkStatusListener() {
    const statusBadge = document.getElementById('network-privacy-status');
    
    function updateOnlineStatus() {
      if (!statusBadge) return;
      if (navigator.onLine) {
        statusBadge.innerHTML = `
          <span class="privacy-pulse"></span>
          <span>100% In-Browser Privacy Mode</span>
        `;
      } else {
        statusBadge.innerHTML = `
          <span class="privacy-pulse" style="background:#06b6d4; box-shadow:0 0 10px #06b6d4;"></span>
          <span>Offline Ready (0% Server Connections)</span>
        `;
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  static getPrivacyPolicyHTML() {
    return `
      <div class="privacy-policy-doc">
        <h3>Privacy Policy & Zero-Data Retention Guarantee</h3>
        <p class="meta-date">Last Updated: August 7, 2026</p>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1rem; border-radius: 12px; margin: 1rem 0; font-size: 0.9rem; color: #a7f3d0;">
          🔒 <strong>Core Privacy Guarantee:</strong> PHOTO TO PDF is engineered as a 100% client-side web application. Every photo upload, image filter adjustment, page rotation, and PDF compilation occurs strictly inside your web browser using HTML5 Canvas & WebAssembly APIs. 
          <strong>Zero photos, metadata, or documents are ever uploaded, sent, or saved to any external backend server or database.</strong>
        </div>

        <h4>1. Information We Do NOT Collect</h4>
        <p>Because processing takes place entirely on your device, we have technical zero-knowledge of your data:</p>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
          <li>No Image Files or Photos (JPG, PNG, WEBP, etc.)</li>
          <li>No Generated PDF Documents</li>
          <li>No IP Addresses or Geolocation Tracking</li>
          <li>No Personal Identifiable Information (PII)</li>
        </ul>

        <h4>2. Local Browser Memory Usage</h4>
        <p>Selected photos are loaded into temporary browser memory (RAM / Object URLs). As soon as you refresh the page or click "Clear All", all temporary image object URLs are immediately revoked and garbage collected from your browser memory.</p>

        <h4>3. Offline Processing Capability</h4>
        <p>Once this website is loaded in your browser, you can disconnect your Wi-Fi or cellular data completely. PHOTO TO PDF will continue to convert, edit, and export your PDFs 100% offline without requiring internet access.</p>

        <h4>4. GDPR & CCPA Compliance</h4>
        <p>Since we do not collect, process, store, or sell any personal data, PHOTO TO PDF is natively compliant with the European Union General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).</p>

        <h4>5. Analytics & Third-Party Cookies</h4>
        <p>We do NOT use invasive cross-site tracking cookies, third-party advertising trackers, or telemetry scripts that spy on your document content.</p>
      </div>
    `;
  }

  static getTermsHTML() {
    return `
      <div class="terms-doc">
        <h3>Terms of Service</h3>
        <p class="meta-date">Effective Date: August 7, 2026</p>

        <h4>1. Free Use & License</h4>
        <p>PHOTO TO PDF provides a free, unlimited photo-to-PDF conversion and editing utility for personal, academic, commercial, and professional use.</p>

        <h4>2. User Data Control</h4>
        <p>You retain 100% ownership and copyright of all image assets and PDF output files processed using this web tool.</p>

        <h4>3. Disclaimer of Warranty</h4>
        <p>The application is provided "AS IS" without warranties of any kind. All processing is executed client-side in your environment.</p>
      </div>
    `;
  }
}
