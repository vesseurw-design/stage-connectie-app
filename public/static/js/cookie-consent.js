/**
 * Cookie Consent Manager voor StageConnect
 * GDPR/AVG Compliant Cookie Consent Banner
 */

class CookieConsent {
    constructor() {
        this.consentKey = 'sc_cookie_consent';
        this.consentGiven = localStorage.getItem(this.consentKey);

        // Toon banner alleen als consent nog niet gegeven is
        if (!this.consentGiven) {
            this.showBanner();
        }
    }

    showBanner() {
        // Voorkom dubbele banners
        if (document.getElementById('cookie-consent-banner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-overlay">
                <div class="cookie-consent-container">
                    <div class="cookie-consent-content">
                        <div class="cookie-icon">
                            🍪
                        </div>
                        <div class="cookie-text">
                            <h3>Cookie Melding</h3>
                            <p>
                                Deze website gebruikt alleen <strong>functionele cookies</strong> die noodzakelijk zijn 
                                voor de werking van de applicatie. We gebruiken <strong>geen tracking of marketing cookies</strong>.
                            </p>
                            <p class="cookie-details">
                                Door op "Accepteren" te klikken, gaat u akkoord met het gebruik van deze cookies. 
                                <a href="privacy-policy.html" target="_blank">Lees ons privacybeleid</a>
                            </p>
                        </div>
                    </div>
                    <div class="cookie-actions">
                        <button id="accept-cookies" class="btn-accept">
                            ✓ Accepteren
                        </button>
                        <button id="decline-cookies" class="btn-decline">
                            ✗ Weigeren
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Voeg styling toe
        this.addStyles();

        // Voeg banner toe aan body
        document.body.appendChild(banner);

        // Event listeners
        document.getElementById('accept-cookies').addEventListener('click', () => {
            this.acceptCookies();
        });

        document.getElementById('decline-cookies').addEventListener('click', () => {
            this.declineCookies();
        });
    }

    addStyles() {
        if (document.getElementById('cookie-consent-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'cookie-consent-styles';
        style.textContent = `
            .cookie-consent-overlay {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                z-index: 9999;
                animation: slideUp 0.3s ease-out;
                padding: 1rem;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .cookie-consent-container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .cookie-consent-content {
                display: flex;
                gap: 1.5rem;
                align-items: flex-start;
            }

            .cookie-icon {
                font-size: 3rem;
                flex-shrink: 0;
            }

            .cookie-text h3 {
                margin: 0 0 0.75rem 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
            }

            .cookie-text p {
                margin: 0 0 0.5rem 0;
                line-height: 1.6;
                color: #4b5563;
                font-size: 0.95rem;
            }

            .cookie-details {
                font-size: 0.875rem;
                color: #6b7280;
            }

            .cookie-details a {
                color: #2563eb;
                text-decoration: underline;
                font-weight: 500;
            }

            .cookie-details a:hover {
                color: #1d4ed8;
            }

            .cookie-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .cookie-actions button {
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }

            .btn-accept {
                background: #10b981;
                color: white;
            }

            .btn-accept:hover {
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .btn-decline {
                background: #e5e7eb;
                color: #374151;
            }

            .btn-decline:hover {
                background: #d1d5db;
            }

            /* Mobile responsive */
            @media (max-width: 640px) {
                .cookie-consent-overlay {
                    padding: 0;
                }

                .cookie-consent-container {
                    border-radius: 16px 16px 0 0;
                    padding: 1.25rem;
                }

                .cookie-consent-content {
                    flex-direction: column;
                    gap: 1rem;
                }

                .cookie-icon {
                    font-size: 2rem;
                }

                .cookie-text h3 {
                    font-size: 1.1rem;
                }

                .cookie-actions {
                    flex-direction: column;
                }

                .cookie-actions button {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    acceptCookies() {
        // Sla consent op
        localStorage.setItem(this.consentKey, 'accepted');
        localStorage.setItem('sc_cookie_consent_date', new Date().toISOString());

        // Verwijder banner met animatie
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => {
                banner.remove();
            }, 300);
        }

        console.log('✅ Cookie consent gegeven');
    }

    declineCookies() {
        // Bij weigering: toon waarschuwing dat app niet werkt zonder functionele cookies
        const confirmed = confirm(
            'Let op: Deze applicatie heeft functionele cookies nodig om te werken. ' +
            'Zonder deze cookies kunt u niet inloggen of de applicatie gebruiken.\n\n' +
            'Weet u zeker dat u deze cookies wilt weigeren?'
        );

        if (confirmed) {
            // Sla weigering op (maar app zal niet werken)
            localStorage.setItem(this.consentKey, 'declined');

            // Verwijder banner
            const banner = document.getElementById('cookie-consent-banner');
            if (banner) {
                banner.remove();
            }

            // Toon melding
            alert('U heeft functionele cookies geweigerd. De applicatie zal mogelijk niet correct werken.');

            console.log('❌ Cookie consent geweigerd');
        }
    }

    // Controleer of consent is gegeven
    static hasConsent() {
        const consent = localStorage.getItem('sc_cookie_consent');
        return consent === 'accepted';
    }

    // Reset consent (voor testing)
    static resetConsent() {
        localStorage.removeItem('sc_cookie_consent');
        localStorage.removeItem('sc_cookie_consent_date');
        console.log('🔄 Cookie consent gereset');
    }
}

// Voeg slideDown animatie toe
const slideDownStyle = document.createElement('style');
slideDownStyle.textContent = `
    @keyframes slideDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(slideDownStyle);

// Initialiseer bij page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CookieConsent();
    });
} else {
    new CookieConsent();
}

// Maak CookieConsent beschikbaar voor debugging
window.CookieConsent = CookieConsent;
