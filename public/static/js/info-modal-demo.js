/**
 * Informatieboekje Modal met Live Zoekfunctie & Alle Onderwerpen
 * Versie 2.0 - Groene Hart Pro College Informatieboekje voor Bedrijven & Stagiairs
 */

(function () {
    const modalHTML = `
    <!-- Informatieboekje Modal -->
    <div id="info-modal" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-3 sm:p-4 transition-opacity duration-300">
        <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-gray-100 transform transition-transform duration-300 scale-95" id="info-modal-card">
            
            <!-- Modal Header -->
            <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-5 sm:p-6 relative">
                <button onclick="closeInfoModal()" class="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="flex items-center gap-3 pr-8">
                    <span class="text-3xl">📖</span>
                    <div>
                        <h3 class="text-xl font-bold">Informatieboekje Stagebedrijven</h3>
                        <p class="text-xs text-blue-100 mt-0.5">Groene Hart Pro College • Praktijkonderwijs Alphen aan den Rijn</p>
                    </div>
                </div>

                <!-- Zoekbalk -->
                <div class="mt-4 relative">
                    <input type="text" id="info-search-input" onkeyup="filterInfoTopics()" 
                        placeholder="🔍 Zoek op trefwoord (bijv. vakantie, ziek, contract, uren, subsidie)..." 
                        class="w-full bg-white text-gray-800 placeholder-gray-400 text-sm font-medium px-4 py-3 pl-11 rounded-2xl shadow-inner outline-none focus:ring-4 focus:ring-purple-300 transition">
                    <svg class="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>

            <!-- Modal Content (Scrollbaar) -->
            <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5" id="info-topics-container">
                
                <!-- Topic 1: Contact -->
                <div class="info-topic bg-purple-50/60 border border-purple-100 rounded-2xl p-4 transition hover:border-purple-200" 
                    data-keywords="contact algemene informatie telefoon stage kantoor email willemien vesseur stagebegeleider praktijkbegeleider stagecoördinator bellen nummer adres anna van burenlaan alphen aan den rijn">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📞</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Contact & Stagecoördinator</h4>
                                <p class="text-xs text-gray-500">Groene Hart Pro College • Telefoonnummers, e-mail & adres</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-purple-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Groene Hart Pro College</strong><br>Anna van Burenlaan 15, 2404 GA Alphen aan den Rijn</p>
                        <p><strong>Algemeen nummer:</strong> 0172 – 473 175<br><strong>Stage kantoor:</strong> 0172 – 427 255</p>
                        <p><strong>Stagecoördinator:</strong> Willemien Vesseur<br>
                        📞 <a href="tel:+31635656874" class="text-blue-600 font-bold hover:underline">+31 6 35656874</a><br>
                        ✉️ <a href="mailto:WVs@youscope.nl" class="text-blue-600 hover:underline">WVs@youscope.nl</a> / <a href="mailto:admpraktijkschool@youscope.nl" class="text-blue-600 hover:underline">admpraktijkschool@youscope.nl</a></p>
                        <p class="bg-purple-100/60 p-2 rounded-lg text-[11px] text-purple-900">💡 <strong>Tip:</strong> Contactgegevens van de specifieke stagebegeleider van uw stagiair vindt u bovenaan uw Stagebedrijf Portaal in StageConnectie. U kunt rechtstreeks bellen of WhatsAppen.</p>
                    </div>
                </div>

                <!-- Topic 2: Algemene Informatie & Onze Leerlingen -->
                <div class="info-topic bg-blue-50/60 border border-blue-100 rounded-2xl p-4 transition hover:border-blue-200" 
                    data-keywords="algemene informatie onze leerlingen praktijkonderwijs praktijk werkt leren door doen visie competenties werkervaring 1e leerjaar 12 t m 18 jaar">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🏫</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Algemene Informatie & Onze Leerlingen</h4>
                                <p class="text-xs text-gray-500">Praktijkonderwijs (12 t/m 18 jaar) • "Praktijk werkt" & "Leren door doen"</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-blue-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p>Met deze informatie informeren wij u over de stage en de samenwerking tussen school, leerling en stagebedrijf. Uw begeleiding is van grote waarde. Dankzij uw inzet krijgen onze leerlingen de kans om werkervaring op te doen en zich verder te ontwikkelen.</p>
                        <p>Het Groene Hart Pro College verzorgt praktijkonderwijs voor jongeren van 12 t/m 18 jaar. Gevleugelde uitspraken binnen ons Praktijkonderwijs zijn <strong>“Praktijk werkt”</strong> en <strong>“Leren door doen”</strong>.</p>
                        <p>Leerlingen ontdekken in hun eigen tempo waar ze goed in zijn en wat ze leuk vinden. Theorie wordt direct gekoppeld aan praktijkvakken en stages. Leerlingen lopen vanaf het 1e leerjaar al stage.</p>
                    </div>
                </div>

                <!-- Topic 3: Onze Stages & Opbouw per Leerjaar -->
                <div class="info-topic bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 transition hover:border-indigo-200" 
                    data-keywords="onze stages stage klas 1 klas 2 leerjaar 3 leerjaar 4 4e klas 5 pro klas mbo 1 entree praktijkroute kinderboerderij maatschappelijke stage groepsstage individuele stage certificaat portfolio diploma">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🎯</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Onze Stages & Opbouw per Leerjaar</h4>
                                <p class="text-xs text-gray-500">Overzicht van stages per leerjaar (klas 1 t/m 5 Pro klas)</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-indigo-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <ul class="list-disc pl-4 space-y-1.5">
                            <li><strong>Klas 1:</strong> Stage bij de kinderboerderij + maatschappelijke stages in/rondom eigen leefomgeving.</li>
                            <li><strong>Klas 2:</strong> Wekelijks interne stage + 2x per jaar 1 dag ervaringsstage.</li>
                            <li><strong>Leerjaar 3:</strong> Woensdagochtend groepsstage bij diverse bedrijven onder begeleiding van een schoolbegeleider.</li>
                            <li><strong>Leerjaar 4:</strong> Individuele arbeidsoriënterende stage op donderdag en vrijdag.</li>
                            <li><strong>5 Pro klas (praktijkroute):</strong> Individuele arbeidsvoorbereidende/plaatsingsstage van maandag t/m woensdag (gerichten op werk).</li>
                            <li><strong>5 Pro klas (MBO 1 entree):</strong> Uitstroomprofiel stage op dinsdag en woensdag a.d.h.v. MBO 1 opleidingen.</li>
                        </ul>
                        <p class="mt-2 bg-indigo-100/50 p-2 rounded-lg text-[11px] text-indigo-900">🎓 <strong>Certificaat:</strong> Na iedere goed verlopen stage krijgt een leerling een certificaat voor in het portfolio. Deze zijn belangrijk voor overgang en diploma.</p>
                    </div>
                </div>

                <!-- Topic 4: Stageovereenkomst & Verzekering -->
                <div class="info-topic bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 transition hover:border-emerald-200" 
                    data-keywords="stageovereenkomst verzekering aansprakelijkheid aansprakelijkheidsverzekering bedrijfsverzekering schade ondertekenen getekend contract regels">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📋</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Stageovereenkomst & Verzekering</h4>
                                <p class="text-xs text-gray-500">Contracten, verplichte ondertekening & schoolverzekering</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-emerald-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Stageovereenkomsten:</strong> Leerlingen krijgen allemaal 3 stageovereenkomsten mee. Deze worden getekend door het bedrijf, de school, de leerling en een ouder/verzorger. Het stagebedrijf ontvangt één getekend exemplaar.</p>
                        <p class="bg-red-50 text-red-800 border border-red-200 p-2 rounded-lg font-semibold">⚠️ Belangrijk: Stageovereenkomsten moeten door alle partijen zijn ondertekend voordat de stage begint. Zonder deze overeenkomst mag een leerling niet beginnen.</p>
                        <p><strong>Verzekering:</strong> Leerlingen op stage zijn via deze overeenkomst via de school verzekerd. De aansprakelijkheidsverzekering van school treedt in werking als de aansprakelijkheids- en/of bedrijfsverzekering bij schade hier niet in voorziet.</p>
                    </div>
                </div>

                <!-- Topic 5: Uitstroom & Diploma's -->
                <div class="info-topic bg-amber-50/60 border border-amber-100 rounded-2xl p-4 transition hover:border-amber-200" 
                    data-keywords="uitstroom diploma praktijkroute mbo route mbo 1 entree diploma praktijkschooldiploma leerwerktraject vervolgopleiding mbo 2">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🎓</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Uitstroom & Diploma's</h4>
                                <p class="text-xs text-gray-500">Praktijkroute vs. MBO 1 Entree route</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-amber-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Praktijkroute:</strong> Leerlingen behalen in de 5e klas een officieel <em>praktijkschooldiploma</em> en stromen door naar arbeid, een leerwerktraject of een vervolgopleiding (MBO 1).</p>
                        <p><strong>MBO route:</strong> Leerlingen behalen in de 5e klas een <em>MBO 1 / Entree diploma</em> en kunnen doorstromen naar MBO 2 of een leerwerktraject.</p>
                    </div>
                </div>

                <!-- Topic 6: Wat verwachten wij van u? & Stagevergoeding -->
                <div class="info-topic bg-teal-50/60 border border-teal-100 rounded-2xl p-4 transition hover:border-teal-200" 
                    data-keywords="verwachten verwachtingen praktijkbegeleider begeleiding veilig werken bedrijfskleding naambordje stagevergoeding beloning gesprek motivatie basisvaardigheden">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🤝</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Verwachtingen & Stagevergoeding</h4>
                                <p class="text-xs text-gray-500">Praktijkbegeleider, veiligheid, beloning & begeleidingsgesprekken</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-teal-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Wat u kunt verwachten:</strong> Leerlingen hebben door stages op school al basisvaardigheden geoefend (op tijd komen, afspraken nakomen, samenwerken). Ze gaan graag aan de slag met assisterende werkzaamheden.</p>
                        <p><strong>Wat wij vragen:</strong> Een vaste, betrokken praktijkbegeleider op de werkvloer waarin veilig werken voorop staat. Leerlingen groeien als ze onderdeel van het bedrijf mogen zijn (bedrijfskleding, naambordje, eigen materiaal).</p>
                        <p><strong>Stagevergoeding:</strong> Een vergoeding wordt op prijs gesteld, maar is niet verplicht. Een beloning heeft in de praktijk vaak een positieve uitwerking op de motivatie.</p>
                        <p><strong>Begeleidingsgesprekken:</strong> De schoolbegeleider komt een paar keer langs op bezoek voor een voortgangsgesprek samen met de leerling.</p>
                    </div>
                </div>

                <!-- Topic 7: Vakantieperiodes 2026-2027 -->
                <div class="info-topic bg-orange-50/60 border border-orange-100 rounded-2xl p-4 transition hover:border-orange-200" 
                    data-keywords="vakantie vakantieperiodes herfstvakantie kerstvakantie voorjaarsvakantie paasweekend meivakantie pinksteren zomervakantie 2026 2027 inhaaluur gemiste uren">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🌴</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Vakantieperiodes 2026-2027</h4>
                                <p class="text-xs text-gray-500">Schoolvakanties waarin er in principe geen stage is</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-orange-100 text-xs text-gray-600 space-y-1.5 leading-relaxed">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Herfstvakantie:</strong><br>19 okt t/m 23 okt 2026</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Kerstvakantie:</strong><br>21 dec 2026 t/m 1 jan 2027</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Voorjaarsvakantie:</strong><br>19 febr t/m 26 febr 2027</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Paasweekend:</strong><br>26 mrt t/m 29 mrt 2027</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Meivakantie:</strong><br>26 apr t/m 7 mei 2027</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100"><strong>Pinksteren:</strong><br>17 mei 2027</div>
                            <div class="bg-white p-2 rounded-lg border border-orange-100 col-span-1 sm:col-span-2"><strong>Zomervakantie:</strong><br>19 juli t/m 27 aug 2027</div>
                        </div>
                        <p class="mt-2 text-[11px] text-gray-500">ℹ️ <em>Heeft de leerling veel uren gemist? In overleg met de stagebegeleider kunnen uren in een vakantie worden ingehaald.</em></p>
                    </div>
                </div>

                <!-- Topic 8: Stageperiodes 2026-2027 (Planning) -->
                <div class="info-topic bg-sky-50/60 border border-sky-100 rounded-2xl p-4 transition hover:border-sky-200" 
                    data-keywords="stageperiode stageperiodes 4e klas 5 pro klas donderdag vrijdag maandag dinsdag woensdag p1 p2 p3 weken planning 2026 2027">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📅</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Stageperiodes 2026-2027 (Planning)</h4>
                                <p class="text-xs text-gray-500">Datums en lesweken voor 4e klas (Do/Vr) en 5 Pro klas (Ma/Di/Wo)</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-sky-100 text-xs text-gray-600 space-y-3 leading-relaxed">
                        <div>
                            <h5 class="font-bold text-sky-900 mb-1">4e klas — 2-daagse stage (Donderdag & Vrijdag)</h5>
                            <ul class="space-y-1 text-xs">
                                <li>• <strong>P1:</strong> 10 sept 2026 t/m 20 nov 2026 (week 37 t/m 47)</li>
                                <li>• <strong>P2:</strong> 26 nov 2026 t/m 12 mrt 2027 (week 48 t/m 10)</li>
                                <li>• <strong>P3:</strong> 18 mrt 2027 t/m 2 juli 2027 (week 11 t/m 26)</li>
                            </ul>
                        </div>
                        <div>
                            <h5 class="font-bold text-sky-900 mb-1">5 Pro klas — 3-daagse stage (Maandag, Dinsdag & Woensdag)</h5>
                            <ul class="space-y-1 text-xs">
                                <li>• <strong>P1:</strong> 7 sept 2026 t/m 16 dec 2026 (week 37 t/m 51)</li>
                                <li>• <strong>P2:</strong> 4 jan 2027 t/m 9 juni 2027 (week 1 t/m week 23)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Topic 9: Praktische Informatie & StageConnectie App -->
                <div class="info-topic bg-rose-50/60 border border-rose-100 rounded-2xl p-4 transition hover:border-rose-200" 
                    data-keywords="praktische informatie stageconnectie aanwezigheid aanwezigheidsregistratie afmelden ziekte ziekmelden verslag stageverslag evaluatie stagecertificaat">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📱</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Praktische Informatie & StageConnectie</h4>
                                <p class="text-xs text-gray-500">Ziekmelden, wekelijkse urenregistratie & stagecertificaat</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-rose-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>1. Ziekmelden:</strong> De leerling moet zichzelf telefonisch bij het stagebedrijf/praktijkbegeleider én bij school/coach afmelden.</p>
                        <p><strong>2. StageConnectie App:</strong> Stagebedrijven geven wekelijks via deze website aan of de leerling aanwezig is geweest (Aanwezig, Afwezig, Te laat, Ziek). 3 klikken en klaar!</p>
                        <p><strong>3. Stageverslag & Certificaat:</strong> Leerlingen maken een stageverslag dat door de praktijkbegeleider ondertekend wordt. Bij voldoende aanwezigheid, inzet en inlevering van het verslag ontvangt de leerling een <strong>Stagecertificaat</strong>.</p>
                    </div>
                </div>

                <!-- Topic 10: Werknemersvaardigheden & Competenties -->
                <div class="info-topic bg-yellow-50/60 border border-yellow-100 rounded-2xl p-4 transition hover:border-yellow-200" 
                    data-keywords="werknemersvaardigheden competenties communicatie afspraken nakomen leervermogen doorzettingsvermogen werktempo productie nauwkeurigheid kwaliteit zelfstandigheid stressbestendigheid flexibiliteit veiligheid arbeidsverhoudingen samenwerken">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🌟</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Werknemersvaardigheden & Competenties</h4>
                                <p class="text-xs text-gray-500">De 10 vaardigheden waarop leerlingen gemonitord worden</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-yellow-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p>Tijdens elk stagegesprek worden (een deel van) de onderstaande punten besproken:</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-1">
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🗣️ <strong>Communicatie:</strong> Duidelijk spreken, beleefd & respectvol reageren.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">⏰ <strong>Afspraken nakomen:</strong> Bedrijfs- en werktijden naleven.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🧠 <strong>Leervermogen:</strong> Opdrachten onthouden, leren van fouten.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">💪 <strong>Doorzettingsvermogen:</strong> Volhouden bij lastige of eentonige taken.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">⚡ <strong>Werktempo:</strong> Op tempo doorwerken op de juiste volgorde.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🎯 <strong>Nauwkeurigheid:</strong> Zorgvuldig werken, werkplek schoon achterlaten.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🙋‍♂️ <strong>Zelfstandigheid:</strong> Hulp vragen, zelf problemen oplossen.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🧘 <strong>Stressbestendigheid:</strong> Kalm blijven onder tijdsdruk.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🪺 <strong>Veiligheid:</strong> Veilig gedrag laten zien & PBM's/kledingregels volgen.</div>
                            <div class="bg-white p-2 rounded-lg border border-yellow-200">🤝 <strong>Samenwerken:</strong> Positieve bijdrage & feedback accepteren.</div>
                        </div>
                    </div>
                </div>

                <!-- Topic 11: Weetjes: Subsidie, Workshops & Vacaturebord -->
                <div class="info-topic bg-cyan-50/60 border border-cyan-100 rounded-2xl p-4 transition hover:border-cyan-200" 
                    data-keywords="weetjes subsidie workshop workshops sbb vacature vacaturebord startersbanen bijbanen vakantiewerk stageplaatsen ervaringsdag">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleTopic(this)">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">💡</span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">Weetjes: Subsidie, Workshops & Vacaturebord</h4>
                                <p class="text-xs text-gray-500">Subsidies bij uitstroom, SBB workshops & vacatures op school</p>
                            </div>
                        </div>
                        <span class="text-gray-400 font-bold text-lg transform transition-transform duration-200 icon">▼</span>
                    </div>
                    <div class="topic-content hidden mt-3 pt-3 border-t border-cyan-100 text-xs text-gray-600 space-y-2 leading-relaxed">
                        <p><strong>Subsidie:</strong> Wist u dat er subsidieregelingen zijn voor onze leerlingen die uitstromen naar een baan? Neem gerust contact op met de stagecoördinator.</p>
                        <p><strong>Workshop voor Praktijkbegeleiders:</strong> Wilt u de begeleiding verdiepen? Bij SBB kunt u terecht voor workshopmodules voor praktijkopleiders.</p>
                        <p><strong>Vacaturebord op School:</strong> Wij hebben een vacaturebord voor bijbanen, vakantiewerk of startersbanen. Mail uw vacature naar de stagecoördinator!</p>
                        <p><strong>Stageplaatsen aanbieden:</strong> Wilt u stage aanbieden voor een ervaringsdag (2e klas), groepsstage (3e klas) of individuele stage? Mail ons en we komen graag langs!</p>
                    </div>
                </div>

                <!-- No Results Message -->
                <div id="no-info-results" class="hidden text-center py-8 text-gray-400">
                    <span class="text-3xl block mb-2">🔍</span>
                    <p class="text-sm font-semibold">Geen onderwerpen gevonden voor deze zoekopdracht.</p>
                    <p class="text-xs text-gray-400 mt-1">Probeer een ander zoekwoord zoals 'vakantie', 'ziek', 'uren', 'subsidie' of 'contact'.</p>
                </div>

            </div>

            <!-- Modal Footer -->
            <div class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span class="text-xs text-gray-400">💡 Tip: Klik op een onderwerp om de details te lezen of zoek op trefwoord.</span>
                <button onclick="closeInfoModal()" class="w-full sm:w-auto px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition">
                    Sluiten
                </button>
            </div>
        </div>
    </div>
    `;

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
