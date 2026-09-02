/**
 * Demo Component: Informatieboekje Modal met Live Zoekfunctie
 * Dit bestand kan eenvoudig verwijderd of uitgeschakeld worden.
 */

(function () {
    // 1. Maak de HTML voor het informatie-modal
    const modalHTML = `
    <!-- Informatieboekje Demo Modal -->
    <div id="info-modal" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4 transition-opacity duration-300">
        <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 transform transition-transform duration-300 scale-95" id="info-modal-card">
            
            <!-- Modal Header -->
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 relative">
                <button onclick="closeInfoModal()" class="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="flex items-center gap-3">
                    <span class="text-3xl">📖</span>
                    <div>
                        <h3 class="text-xl font-bold">Informatieboekje & Regels</h3>
                        <p class="text-xs text-purple-100 mt-0.5">Groene Hart Praktijkschool • Handleiding voor Stagiair & Werkgever</p>
                    </div>
                </div>

                <!-- Zoekbalk -->
                <div class="mt-4 relative">
                    <input type="text" id="info-search-input" onkeyup="filterInfoTopics()" 
                        placeholder="🔍 Zoek op trefwoord (bijv. ziekmelden, uren, regels, contact)..." 
                        class="w-full bg-white text-gray-800 placeholder-gray-400 text-sm font-medium px-4 py-3 pl-11 rounded-2xl shadow-inner outline-none focus:ring-4 focus:ring-purple-300 transition">
                    <svg class="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>

            <!-- Modal Content (Scrollbaar) -->
            <div class="p-6 overflow-y-auto flex-1 space-y-4" id="info-topics-container">
                
                <!-- Topic 1 -->
                <div class="info-topic bg-purple-50/60 border border-purple-100 rounded-2xl p-4 transition hover:border-purple-200" data-keywords="ziek ziekmelden afwezig koorts ziekenhuis ziekmelding">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🤒</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Ziekmelden & Afwezigheid</h4>
                                <p class="text-xs text-gray-500">Wat moet je doen als je ziek bent of niet kunt komen?</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-purple-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>1. Stagebedrijf bellen:</strong> Bel direct voor aanvang van je stagedag (vóór 08:30) naar je stagebegeleider bij het stagebedrijf.</p>
                        <p><strong>2. School informeren:</strong> Laat je ouders/verzorgers naar de school bellen om je ziekmelding door te geven.</p>
                        <p><strong>3. In de app registreren:</strong> Vink 'Afwezig' of 'Ziek' aan in deze app.</p>
                    </div>
                </div>

                <!-- Topic 2 -->
                <div class="info-topic bg-yellow-50/60 border border-yellow-100 rounded-2xl p-4 transition hover:border-yellow-200" data-keywords="te laat minuten bus vertraging verslapen">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⏱️</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Te Laat Komen</h4>
                                <p class="text-xs text-gray-500">Regels bij vertraging of verslapen</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-yellow-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p>Mocht je onverhoopt te laat komen door bijvoorbeeld openbaar vervoer of vertraging, geef dit dan direct door via een bericht of telefoontje.</p>
                        <p>Registreer in de app de status <strong>Te laat</strong> en vul het aantal minuten in.</p>
                    </div>
                </div>

                <!-- Topic 3 -->
                <div class="info-topic bg-blue-50/60 border border-blue-100 rounded-2xl p-4 transition hover:border-blue-200" data-keywords="uren werktijden pauze stagedagen urenregistratie">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⏰</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Werktijden & Pauzes</h4>
                                <p class="text-xs text-gray-500">Stagedagen, maximale uren en pauzeregeling</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-blue-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p>Een standaard stagedag duurt meestal tussen de 6 en 8 uur per dag (inclusief pauze).</p>
                        <p>Pauzes worden doorgebracht volgens de afspraken van het stagebedrijf.</p>
                    </div>
                </div>

                <!-- Topic 4 -->
                <div class="info-topic bg-green-50/60 border border-green-100 rounded-2xl p-4 transition hover:border-green-200" data-keywords="contact begeleider docent telefoon school email nummer mentor">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📞</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Contactpersonen School</h4>
                                <p class="text-xs text-gray-500">Wie kun je benaderen bij vragen of problemen?</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-green-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Stagecoördinator:</strong> Groene Hart Praktijkschool</p>
                        <p><strong>Telefoon:</strong> 0172 - 423 456</p>
                        <p><strong>E-mail:</strong> stage@groenehartpro.nl</p>
                    </div>
                </div>

                <!-- No Results Message -->
                <div id="no-info-results" class="hidden text-center py-8 text-gray-400">
                    <span class="text-3xl block mb-2">🔍</span>
                    <p class="text-sm font-semibold">Geen onderwerpen gevonden voor deze zoekopdracht.</p>
                    <p class="text-xs text-gray-400 mt-1">Probeer een ander zoekwoord zoals 'ziek', 'uren' of 'contact'.</p>
                </div>

            </div>

            <!-- Modal Footer -->
            <div class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span class="text-xs text-gray-400">💡 Tip: Klik op een onderwerp om de details te lezen.</span>
                <button onclick="closeInfoModal()" class="w-full sm:w-auto px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition">
                    Sluiten
                </button>
            </div>
        </div>
    </div>
    `;

    // Injecteer HTML zodra de DOM geladen is
    function injectModal() {
        if (!document.getElementById('info-modal')) {
            const div = document.createElement('div');
            div.innerHTML = modalHTML;
            document.body.appendChild(div.firstElementChild);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

    // Global Functions
    window.openInfoModal = function () {
        const modal = document.getElementById('info-modal');
        if (modal) {
            modal.classList.remove('hidden');
            const searchInput = document.getElementById('info-search-input');
            if (searchInput) {
                searchInput.value = '';
                filterInfoTopics();
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    };

    window.closeInfoModal = function () {
        const modal = document.getElementById('info-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.toggleTopic = function (element) {
        const parent = element.closest('.info-topic');
        const content = parent.querySelector('.topic-content');
        const icon = parent.querySelector('.icon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    };

    window.filterInfoTopics = function () {
        const input = document.getElementById('info-search-input');
        if (!input) return;
        const filter = input.value.toLowerCase().trim();
        const topics = document.querySelectorAll('.info-topic');
        let visibleCount = 0;

        topics.forEach(topic => {
            const text = topic.textContent.toLowerCase();
            const keywords = topic.dataset.keywords || '';

            if (filter === '' || text.includes(filter) || keywords.includes(filter)) {
                topic.classList.remove('hidden');
                visibleCount++;
                // Als er gezocht wordt, klap de resultaten automatisch open
                if (filter.length > 1) {
                    const content = topic.querySelector('.topic-content');
                    const icon = topic.querySelector('.icon');
                    if (content) content.classList.remove('hidden');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            } else {
                topic.classList.add('hidden');
            }
        });

        const noResults = document.getElementById('no-info-results');
        if (noResults) {
            if (visibleCount === 0) {
                noResults.classList.remove('hidden');
            } else {
                noResults.classList.add('hidden');
            }
        }
    };
})();
