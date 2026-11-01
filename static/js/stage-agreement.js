/**
 * StageConnectie - Digitale Stageovereenkomst (PDF) & Ondertekening Module
 *
 * Ondersteunt:
 * - Uploaden van een LVS Stageovereenkomst PDF (door Admin & Stagebegeleider)
 * - Genereren van een realistische LVS Proef-PDF om direct te testen
 * - Digitaal ondertekenen door 4 partijen:
 *     1. School / Stagebegeleider (school)
 *     2. Stagebedrijf (employer)
 *     3. Stagiair (student)
 *     4. Ouder / Verzorger (parent - vanuit het Leerlingportaal)
 * - Ondertekenen kan op 2 manieren (voor elk apparaat, met of zonder touchscreen):
 *     ✍️ Tekenen met vinger, muis of trackpad
 *     ⌨️ Naam typen met toetsenbord (wordt omgezet in geschreven handtekening + akkoord-verklaring)
 * - Handtekeningen worden rechtstreeks op de vaste vakjes van de PDF geplaatst (via pdf-lib).
 * - AVG-Veiligheidsslot (Optie B - Doorgeefluik):
 *     Alleen de Admin mag de PDF na afloop wissen, en pas NADAT de PDF daadwerkelijk
 *     geprint/gedownload is én het extra controle-vinkje is aangevinkt.
 *     Na het wissen blijft de status '✅ Volledig ondertekend & AVG-gearchiveerd' bewaard.
 */

(function () {
    const STORAGE_BUCKET = 'stageovereenkomsten';

    // Exacte posities uit de GHPC LVS Stageovereenkomst PDF (A4 = 595.28 x 841.89 pt):
    // Rij 1 (kopteksten op y=195.79, "Naam:" op y=177.55, "Handtekening:" op y=158.35):
    //   - Kolom 1 (x=132.98): Namens het stagebedrijf
    //   - Kolom 2 (x=361.94): Namens de onderwijsinstelling/school
    // Rij 2 (kopteksten op y=129.06, "Naam:" op y=103.63, "Handtekening" op y=81.07):
    //   - Kolom 1 (x=132.98): Ouders/verzorgers/voogd
    //   - Kolom 2 (x=361.94): Stagiair/leerling
    const DEFAULT_SIGNATURE_BOXES = {
        employer: {
            x: 133,
            nameY: 177.55,
            sigY: 141,
            width: 195,
            height: 30,
            label: 'Namens het stagebedrijf'
        },
        school: {
            x: 362,
            nameY: 177.55,
            sigY: 141,
            width: 195,
            height: 30,
            label: 'Namens de onderwijsinstelling/school'
        },
        parent: {
            x: 133,
            nameY: 103.63,
            sigY: 63,
            width: 195,
            height: 34,
            label: 'Ouders/verzorgers/voogd'
        },
        student: {
            x: 362,
            nameY: 103.63,
            sigY: 63,
            width: 195,
            height: 34,
            label: 'Stagiair/leerling'
        }
    };

    const PARTY_META = {
        school:   { key: 'school',   icon: '🏫', label: 'School / Begeleider', shortLabel: 'School' },
        employer: { key: 'employer', icon: '🏢', label: 'Stagebedrijf',        shortLabel: 'Stagebedrijf' },
        student:  { key: 'student',  icon: '🎓', label: 'Stagiair',            shortLabel: 'Stagiair' },
        parent:   { key: 'parent',   icon: '👪', label: 'Ouder / Verzorger',   shortLabel: 'Ouders' }
    };

    let pdfLibPromise = null;
    function ensurePdfLib() {
        if (window.PDFLib) return Promise.resolve(window.PDFLib);
        if (pdfLibPromise) return pdfLibPromise;
        pdfLibPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            s.onload = () => resolve(window.PDFLib);
            s.onerror = () => reject(new Error('Kon pdf-lib niet laden'));
            document.head.appendChild(s);
        });
        return pdfLibPromise;
    }

    function getSupabase() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.db && window.db.from) return window.db;
        if (window.supabase && window.supabase.createClient) {
            window._scAgreementSb = window._scAgreementSb || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
            return window._scAgreementSb;
        }
        return null;
    }

    function uint8ToBase64(bytes) {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToUint8(base64) {
        const clean = base64.replace(/^data:application\/pdf;base64,/, '');
        const binary = atob(clean);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function formatDutchDateTime(isoStr) {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoStr;
        }
    }

    const FALLBACK_USER_AGENT = 'STAGE_AGREEMENT_V1';

    // Haal stageovereenkomst op voor een student (of allemaal), met automatische fallback naar push_subscriptions
    async function fetchAgreementsForStudents(studentIds) {
        const sb = getSupabase();
        if (!sb) return [];
        try {
            let query = sb.from('Stageovereenkomsten').select('*');
            if (Array.isArray(studentIds) && studentIds.length > 0) {
                query = query.in('student_id', studentIds);
            }
            const { data, error } = await query;
            if (!error && Array.isArray(data)) {
                return data;
            }
        } catch (e) {
            // Fallback hieronder
        }

        // Fallback: lees uit push_subscriptions (user_agent = 'STAGE_AGREEMENT_V1') als Stageovereenkomsten tabel nog niet bestaat
        try {
            let fbQuery = sb.from('push_subscriptions').select('*').eq('user_agent', FALLBACK_USER_AGENT);
            if (Array.isArray(studentIds) && studentIds.length > 0) {
                fbQuery = fbQuery.in('student_id', studentIds);
            }
            const { data: fbData, error: fbErr } = await fbQuery;
            if (!fbErr && Array.isArray(fbData)) {
                return fbData
                    .map(row => row.subscription && typeof row.subscription === 'object' ? { ...row.subscription, _fb_row_id: row.id } : null)
                    .filter(Boolean);
            }
        } catch (fbCatch) {
            console.warn('Stageovereenkomsten fallback niet beschikbaar:', fbCatch);
        }
        return [];
    }

    async function fetchSingleAgreement(studentId) {
        if (!studentId) return null;
        const list = await fetchAgreementsForStudents([studentId]);
        return list.find(a => String(a.student_id) === String(studentId)) || null;
    }

    function countSignatures(agreement) {
        if (!agreement || !agreement.signatures) return 0;
        return ['school', 'employer', 'student', 'parent'].filter(k => agreement.signatures[k]?.signed_at).length;
    }

    function isFullySigned(agreement) {
        return countSignatures(agreement) === 4;
    }

    // Laad de echte GHPC LVS Voorbeeld-PDF (of genereer een fallback als die niet bereikbaar is)
    async function generateSampleLvsPdfBytes(student, company, supervisor) {
        try {
            const res = await fetch('/voorbeeld-stageovereenkomst-ghpc.pdf?t=' + Date.now());
            if (res.ok) {
                const buf = await res.arrayBuffer();
                return new Uint8Array(buf);
            }
        } catch (e) {
            console.warn('Kon /voorbeeld-stageovereenkomst-ghpc.pdf niet ophalen, gebruik fallback generator:', e);
        }

        const PDFLib = await ensurePdfLib();
        const { PDFDocument, StandardFonts, rgb } = PDFLib;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

        page.drawText('Stage overeenkomst', { x: 345.15, y: 793.39, size: 17, font: fontBold, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Akkoordverklaring:', { x: 31.23, y: 259.63, size: 9, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText('Namens het stagebedrijf:', { x: 132.98, y: 195.79, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Namens de onderwijsinstelling/school:', { x: 361.94, y: 195.79, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Naam:', { x: 31.23, y: 177.55, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Handtekening:', { x: 31.71, y: 158.35, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Ouders/verzorgers/voogd:', { x: 132.98, y: 129.06, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Stagiair/leerling:', { x: 361.94, y: 129.06, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Naam:', { x: 31.23, y: 103.63, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });
        page.drawText('Handtekening', { x: 31.23, y: 81.07, size: 9, font: fontReg, color: rgb(0.176, 0.176, 0.176) });

        return await pdfDoc.save();
    }

    // Plaats de Naam (op de 'Naam:' regel) en de Handtekening (op de 'Handtekening:' regel)
    // op exact de juiste coördinaten van de GHPC LVS Stageovereenkomst PDF
    async function stampSignatureIntoPdfBytes(existingPdfBytes, partyKey, signerName, signatureDataUrl, signedAtIso, customBoxes) {
        const PDFLib = await ensurePdfLib();
        const { PDFDocument, StandardFonts, rgb } = PDFLib;

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        const boxes = customBoxes || DEFAULT_SIGNATURE_BOXES;
        const rawBox = boxes[partyKey] || DEFAULT_SIGNATURE_BOXES[partyKey];
        const defBox = DEFAULT_SIGNATURE_BOXES[partyKey];

        const x = rawBox.x || defBox.x;
        const nameY = rawBox.nameY || defBox.nameY;
        const sigY = rawBox.sigY || rawBox.y || defBox.sigY;
        const width = rawBox.width || defBox.width;
        const height = rawBox.height || defBox.height;

        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // 1. Maak het 'Naam:' veld schoon en schrijf de naam van de ondertekenaar op de exacte 'Naam:' lijn
        lastPage.drawRectangle({
            x: x - 2,
            y: nameY - 3,
            width: width,
            height: 14,
            color: rgb(1, 1, 1)
        });
        lastPage.drawText(String(signerName || ''), {
            x: x,
            y: nameY,
            size: 9,
            font: fontBold,
            color: rgb(0.08, 0.12, 0.22)
        });

        // 2. Maak het 'Handtekening:' veld schoon en plaats de handtekening + datum/tijdstip
        lastPage.drawRectangle({
            x: x - 2,
            y: sigY - 8,
            width: width,
            height: height + 8,
            color: rgb(1, 1, 1)
        });

        if (signatureDataUrl && signatureDataUrl.startsWith('data:image/png')) {
            const pngImage = await pdfDoc.embedPng(signatureDataUrl);
            const imgWidth = Math.min(width - 15, 135);
            const imgHeight = Math.min(height, 30);
            lastPage.drawImage(pngImage, {
                x: x,
                y: sigY + 1,
                width: imgWidth,
                height: imgHeight
            });
        }

        const dateFormatted = formatDutchDateTime(signedAtIso);
        lastPage.drawText(`Digitaal getekend: ${dateFormatted}`, {
            x: x,
            y: sigY - 6,
            size: 6.5,
            font: fontReg,
            color: rgb(0.25, 0.35, 0.45)
        });

        return await pdfDoc.save();
    }

    // Upload PDF bytes naar Supabase Storage + sla record op in Stageovereenkomsten tabel
    async function saveAgreementPdfAndRecord(student, pdfBytes, existingAgreement, extraFields = {}) {
        const sb = getSupabase();
        const nowIso = new Date().toISOString();
        const storagePath = `student_${student.id}.pdf`;
        const pdfBase64 = uint8ToBase64(pdfBytes);

        // 1. Probeer naar Supabase Storage te uploaden (/storage/v1/object/stageovereenkomsten/...)
        try {
            const uploadUrl = `${window.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;
            await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_KEY}`,
                    'Content-Type': 'application/pdf',
                    'x-upsert': 'true'
                },
                body: pdfBytes
            });
        } catch (storageErr) {
            console.warn('Storage upload fallback naar db base64:', storageErr);
        }

        // 2. Sla metadata + base64 backup op in Stageovereenkomsten tabel
        const record = {
            id: existingAgreement?.id || (crypto.randomUUID ? crypto.randomUUID() : 'agr-' + Date.now()),
            student_id: student.id,
            student_name: student.name,
            company_id: student.company_id || null,
            supervisor_id: student.supervisor_id || null,
            storage_path: storagePath,
            pdf_base64: pdfBase64,
            status: extraFields.status || existingAgreement?.status || 'pending_signatures',
            signatures: extraFields.signatures || existingAgreement?.signatures || {},
            signature_boxes: extraFields.signature_boxes || existingAgreement?.signature_boxes || DEFAULT_SIGNATURE_BOXES,
            printed_by_admin_at: extraFields.printed_by_admin_at !== undefined ? extraFields.printed_by_admin_at : (existingAgreement?.printed_by_admin_at || null),
            printed_by_supervisor_at: extraFields.printed_by_supervisor_at !== undefined ? extraFields.printed_by_supervisor_at : (existingAgreement?.printed_by_supervisor_at || null),
            archived_at: extraFields.archived_at !== undefined ? extraFields.archived_at : (existingAgreement?.archived_at || null),
            uploaded_by: extraFields.uploaded_by || existingAgreement?.uploaded_by || 'School',
            updated_at: nowIso,
            created_at: existingAgreement?.created_at || nowIso
        };

        let savedInMainTable = false;
        try {
            const { data, error } = await sb
                .from('Stageovereenkomsten')
                .upsert(record, { onConflict: 'student_id' })
                .select();

            if (!error) {
                savedInMainTable = true;
                return (data && data[0]) ? data[0] : record;
            }
            if (existingAgreement?.id && !existingAgreement._fb_row_id) {
                const { error: updErr } = await sb.from('Stageovereenkomsten').update(record).eq('id', existingAgreement.id);
                if (!updErr) savedInMainTable = true;
            }
        } catch (e) {}

        // Automatische fallback naar push_subscriptions als Stageovereenkomsten tabel nog niet in Supabase staat
        if (!savedInMainTable) {
            try {
                const { data: existingFb } = await sb
                    .from('push_subscriptions')
                    .select('id')
                    .eq('student_id', student.id)
                    .eq('user_agent', FALLBACK_USER_AGENT);

                if (existingFb && existingFb.length > 0) {
                    await sb.from('push_subscriptions')
                        .update({ subscription: record, updated_at: nowIso })
                        .eq('id', existingFb[0].id);
                } else {
                    await sb.from('push_subscriptions')
                        .insert({
                            student_id: student.id,
                            subscription: record,
                            user_agent: FALLBACK_USER_AGENT
                        });
                }
            } catch (fbErr) {
                console.warn('Stageovereenkomsten fallback opslaan waarschuwing:', fbErr);
            }
        }

        return record;
    }

    // Haal de PDF bytes op van een agreement
    async function getAgreementPdfBytes(agreement) {
        if (!agreement) return null;
        if (agreement.pdf_base64) {
            return base64ToUint8(agreement.pdf_base64);
        }
        if (agreement.storage_path) {
            const url = `${window.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${agreement.storage_path}?t=${Date.now()}`;
            const res = await fetch(url);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                return new Uint8Array(buf);
            }
        }
        return null;
    }

    // Maak een Blob URL om de PDF veilig in een iframe of nieuw tabblad te tonen/printen
    async function createAgreementPdfBlobUrl(agreement) {
        const bytes = await getAgreementPdfBytes(agreement);
        if (!bytes) return null;
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
    }

    // Genereer een geschreven handtekening (PNG dataURL) vanuit een getypte naam (voor apparaten zonder touchscreen)
    function renderTypedSignatureToDataUrl(typedName) {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Sierlijke cursieve handtekening stijl
        ctx.save();
        ctx.translate(24, 92);
        ctx.rotate(-0.04);
        ctx.font = 'italic 600 44px "Brush Script MT", "Apple Chancery", "Snell Roundhand", "Segoe Script", "Bradley Hand", Georgia, serif';
        ctx.fillStyle = '#0f296b';
        ctx.fillText(typedName, 0, 0);

        // Onderstreep-krul zoals een echte handtekening
        const textWidth = Math.min(ctx.measureText(typedName).width, 420);
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.quadraticCurveTo(textWidth * 0.55, 2, textWidth + 12, 10);
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        return canvas.toDataURL('image/png');
    }

    // Genereer HTML voor de 4 handtekening-badges
    function renderSignatureBadgesHtml(agreement, options = {}) {
        const sigs = agreement?.signatures || {};
        const isArchived = agreement?.status === 'archived_avg';
        const canSignParties = options.canSignParties || []; // bijv. ['student', 'parent']
        const studentId = agreement?.student_id || options.studentId;

        return ['school', 'employer', 'student', 'parent'].map(key => {
            const meta = PARTY_META[key];
            const sig = sigs[key];
            const isSigned = !!(sig && sig.signed_at);
            const canSign = !isArchived && canSignParties.includes(key) && agreement && (agreement.pdf_base64 || agreement.storage_path);

            if (isSigned) {
                return `
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-base shrink-0">✅</span>
                            <div class="min-w-0">
                                <div class="font-bold text-emerald-900 truncate">${meta.icon} ${meta.label}</div>
                                <div class="text-[11px] text-emerald-700 truncate">${sig.signer_name || 'Ondertekend'} • ${formatDutchDateTime(sig.signed_at)}</div>
                            </div>
                        </div>
                        ${canSign ? `<button type="button" onclick="window.StageAgreements.openSignModal('${studentId}', '${key}')" class="text-[11px] font-semibold text-emerald-700 hover:underline ml-2 shrink-0">Wijzig</button>` : ''}
                    </div>
                `;
            }

            return `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-base shrink-0">⏳</span>
                        <div class="min-w-0">
                            <div class="font-bold text-amber-900 truncate">${meta.icon} ${meta.label}</div>
                            <div class="text-[11px] text-amber-700">Wacht op handtekening</div>
                        </div>
                    </div>
                    ${canSign ? `
                        <button type="button" onclick="window.StageAgreements.openSignModal('${studentId}', '${key}')"
                            class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition shrink-0">
                            ✍️ Tekenen
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Zorg dat de benodigde modals in de DOM staan
    function ensureModalsInDom() {
        if (document.getElementById('sc-stage-agreement-modals')) return;

        const container = document.createElement('div');
        container.id = 'sc-stage-agreement-modals';
        container.className = 'no-print';
        container.innerHTML = `
            <!-- 1. ONDERTEKEN MODAL (TEKENEN OF TYPEN) -->
            <div id="sc-sign-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-7 max-h-[92vh] overflow-y-auto border border-slate-200">
                    <div class="flex justify-between items-start gap-3 mb-4">
                        <div>
                            <span id="sc-sign-role-badge" class="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 mb-1">Ondertekenen</span>
                            <h3 id="sc-sign-title" class="text-xl font-black text-slate-900">Stageovereenkomst ondertekenen</h3>
                            <p id="sc-sign-subtitle" class="text-xs text-slate-500 mt-0.5"></p>
                        </div>
                        <button type="button" onclick="window.StageAgreements.closeSignModal()" class="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none px-2">&times;</button>
                    </div>

                    <!-- Knop om de PDF eerst te bekijken -->
                    <div class="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div class="text-xs text-slate-700">
                            📄 <strong>Stageovereenkomst controleren?</strong> Bekijk het volledige document voordat je tekent.
                        </div>
                        <button type="button" id="sc-sign-preview-pdf-btn" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 shrink-0 shadow-sm">
                            👁️ Bekijk PDF
                        </button>
                    </div>

                    <!-- Naam invullen -->
                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Volledige naam ondertekenaar *</label>
                        <input type="text" id="sc-signer-name-input" placeholder="Vul voor- en achternaam in..."
                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold text-slate-900" />
                    </div>

                    <!-- Keuze: Tekenen (vinger/muis) OF Typen (toetsenbord) -->
                    <div class="mb-3">
                        <div class="flex rounded-xl bg-slate-100 p-1 gap-1 mb-3">
                            <button type="button" id="sc-tab-draw" onclick="window.StageAgreements.switchSignMethod('draw')"
                                class="flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition bg-white text-indigo-700 shadow-sm">
                                ✍️ Tekenen (vinger of muis)
                            </button>
                            <button type="button" id="sc-tab-type" onclick="window.StageAgreements.switchSignMethod('type')"
                                class="flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition text-slate-600 hover:text-slate-900">
                                ⌨️ Typen (zonder touchscreen)
                            </button>
                        </div>

                        <!-- Paneel A: Tekenen op canvas -->
                        <div id="sc-panel-draw">
                            <div class="relative border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/30 overflow-hidden">
                                <canvas id="sc-signature-canvas" width="500" height="160" class="w-full h-[150px] cursor-crosshair touch-none block"></canvas>
                                <button type="button" onclick="window.StageAgreements.clearCanvas()"
                                    class="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-bold shadow-sm">
                                    🧹 Wissen
                                </button>
                                <div class="pointer-events-none absolute bottom-2 left-3 text-[11px] text-slate-400">
                                    Teken hierboven met je vinger (touchscreen) of muis/trackpad
                                </div>
                            </div>
                        </div>

                        <!-- Paneel B: Typen op toetsenbord -->
                        <div id="sc-panel-type" class="hidden">
                            <div class="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 text-center">
                                <div class="text-xs text-slate-500 mb-1">Voorbeeld geschreven handtekening op de PDF:</div>
                                <div id="sc-typed-preview-box" class="py-3 px-4 bg-white rounded-xl border border-slate-200 min-h-[70px] flex items-center justify-center">
                                    <span id="sc-typed-preview-text" style="font-family: 'Brush Script MT', 'Apple Chancery', 'Snell Roundhand', 'Segoe Script', Georgia, serif; font-style: italic; font-size: 32px; color: #0f296b;">
                                        Typ hierboven je naam...
                                    </span>
                                </div>
                                <p class="text-[11px] text-slate-500 mt-2">
                                    Ideaal voor vaste pc's of laptops zonder touchscreen. Je getypte naam wordt als handtekening met datum & tijdstip op de PDF geplaatst.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Akkoord-vinkje -->
                    <label class="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer mb-5">
                        <input type="checkbox" id="sc-sign-consent-checkbox" checked class="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                        <span class="text-xs text-emerald-950 leading-relaxed">
                            Ik ga akkoord met de inhoud van deze stageovereenkomst en plaats hierbij rechtsgeldig mijn digitale handtekening.
                        </span>
                    </label>

                    <div class="flex gap-3">
                        <button type="button" onclick="window.StageAgreements.closeSignModal()"
                            class="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">
                            Annuleren
                        </button>
                        <button type="button" id="sc-confirm-sign-btn" onclick="window.StageAgreements.submitSignature()"
                            class="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg transition">
                            ✅ Handtekening plaatsen op PDF
                        </button>
                    </div>
                </div>
            </div>

            <!-- 2. PDF VIEWER & PRINT MODAL -->
            <div id="sc-pdf-viewer-modal" class="hidden fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[10001] flex items-center justify-center p-3 md:p-6">
                <div class="bg-white rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                    <div class="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 id="sc-viewer-title" class="font-bold text-base">📄 Stageovereenkomst PDF</h3>
                            <p id="sc-viewer-subtitle" class="text-xs text-slate-300"></p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="sc-viewer-print-btn"
                                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center gap-1.5">
                                🖨️ Printen / Opslaan voor LVS
                            </button>
                            <button type="button" onclick="window.StageAgreements.closePdfViewer()"
                                class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">
                                ✕ Sluiten
                            </button>
                        </div>
                    </div>
                    <div class="flex-1 bg-slate-200 relative">
                        <iframe id="sc-pdf-iframe" class="w-full h-full border-0" title="Stageovereenkomst PDF"></iframe>
                    </div>
                </div>
            </div>

            <!-- 3. AVG VEILIGHEIDSSLOT MODAL (ALLEEN ADMIN: DEFINITIEF WISSEN NA PRINTEN) -->
            <div id="sc-avg-delete-modal" class="hidden fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[10002] flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-red-200">
                    <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-2xl mb-3">
                        🔒
                    </div>
                    <h3 class="text-lg font-black text-slate-900">AVG-Veiligheidscontrole: PDF wissen</h3>
                    <p id="sc-avg-delete-student-label" class="text-xs font-bold text-indigo-600 mt-0.5 mb-3"></p>
                    <p class="text-xs text-slate-600 leading-relaxed mb-4">
                        Om te voldoen aan de verwerkersovereenkomst (geen woonadressen permanent opslaan in StageConnectie) wordt het PDF-bestand nu gewist.
                        Bij de stagiair blijft wél de groene status <strong>"✅ Stageovereenkomst ondertekend & geprint"</strong> bewaard.
                    </p>

                    <label class="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 cursor-pointer mb-5">
                        <input type="checkbox" id="sc-avg-confirm-printed-checkbox" onchange="document.getElementById('sc-avg-confirm-delete-btn').disabled = !this.checked"
                            class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                        <span class="text-xs font-bold text-amber-950 leading-relaxed">
                            Ik bevestig dat ik de ondertekende stageovereenkomst heb geprint of opgeslagen in het LVS van school, en dat de PDF veilig uit StageConnectie verwijderd mag worden.
                        </span>
                    </label>

                    <div class="flex gap-3">
                        <button type="button" onclick="document.getElementById('sc-avg-delete-modal').classList.add('hidden')"
                            class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50">
                            Annuleren
                        </button>
                        <button type="button" id="sc-avg-confirm-delete-btn" disabled onclick="window.StageAgreements.confirmAvgDeletePdf()"
                            class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow transition">
                            🗑️ Definitief wissen (AVG)
                        </button>
                    </div>
                </div>
            </div>

            <!-- 4. ADMIN & BEGELEIDER CENTRAAL OVERZICHT MODAL -->
            <div id="sc-agreements-overview-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 md:p-8 max-h-[90vh] flex flex-col border border-slate-200">
                    <div class="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-slate-100">
                        <div>
                            <h2 class="text-xl font-black text-slate-900">📄 Digitale Stageovereenkomsten (PDF)</h2>
                            <p class="text-xs text-slate-500 mt-0.5">
                                Upload de LVS-stageovereenkomst, volg de 4 handtekeningen (School, Bedrijf, Stagiair, Ouders) en print na afloop.
                            </p>
                        </div>
                        <button type="button" onclick="document.getElementById('sc-agreements-overview-modal').classList.add('hidden')"
                            class="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none px-2">&times;</button>
                    </div>
                    <div id="sc-agreements-overview-list" class="flex-1 overflow-y-auto space-y-4 pr-1">
                        <div class="text-center py-8 text-slate-400 text-sm">Stageovereenkomsten laden...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        initSignatureCanvasEvents();
    }

    // State voor het tekenen op het canvas
    let signContext = {
        studentId: null,
        partyKey: null,
        method: 'draw', // 'draw' | 'type'
        hasDrawn: false,
        onCompleteCallback: null
    };

    function initSignatureCanvasEvents() {
        const canvas = document.getElementById('sc-signature-canvas');
        const nameInput = document.getElementById('sc-signer-name-input');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let drawing = false;
        let lastX = 0;
        let lastY = 0;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const start = (e) => {
            e.preventDefault();
            drawing = true;
            signContext.hasDrawn = true;
            const pos = getPos(e);
            lastX = pos.x;
            lastY = pos.y;
        };

        const move = (e) => {
            if (!drawing) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = '#0f296b';
            ctx.lineWidth = 2.6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            lastX = pos.x;
            lastY = pos.y;
        };

        const stop = () => {
            drawing = false;
        };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);

        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', stop);

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const previewText = document.getElementById('sc-typed-preview-text');
                if (previewText) {
                    previewText.textContent = nameInput.value.trim() || 'Typ hierboven je naam...';
                }
            });
        }
    }

    function clearCanvas() {
        const canvas = document.getElementById('sc-signature-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        signContext.hasDrawn = false;
    }

    function switchSignMethod(method) {
        signContext.method = method === 'type' ? 'type' : 'draw';
        const tabDraw = document.getElementById('sc-tab-draw');
        const tabType = document.getElementById('sc-tab-type');
        const panelDraw = document.getElementById('sc-panel-draw');
        const panelType = document.getElementById('sc-panel-type');

        if (signContext.method === 'draw') {
            tabDraw.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition bg-white text-indigo-700 shadow-sm';
            tabType.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition text-slate-600 hover:text-slate-900';
            panelDraw.classList.remove('hidden');
            panelType.classList.add('hidden');
        } else {
            tabType.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition bg-white text-indigo-700 shadow-sm';
            tabDraw.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition text-slate-600 hover:text-slate-900';
            panelType.classList.remove('hidden');
            panelDraw.classList.add('hidden');
        }
    }

    // Cache van bekende studenten voor snelle acties
    const studentMap = new Map();
    function registerStudents(studentsList) {
        (studentsList || []).forEach(s => {
            if (s && s.id) studentMap.set(String(s.id), s);
        });
    }

    async function resolveStudent(studentId) {
        if (studentMap.has(String(studentId))) return studentMap.get(String(studentId));
        if (window.currentStudent && String(window.currentStudent.id) === String(studentId)) return window.currentStudent;
        const sb = getSupabase();
        if (!sb) return null;
        const { data } = await sb.from('Students').select('*').eq('id', studentId).single();
        if (data) studentMap.set(String(data.id), data);
        return data;
    }

    // Open het onderteken-venster voor een specifieke partij ('school', 'employer', 'student', 'parent')
    async function openSignModal(studentId, partyKey, onComplete) {
        ensureModalsInDom();
        const student = await resolveStudent(studentId);
        const agreement = await fetchSingleAgreement(studentId);
        if (!agreement) {
            alert('Er is nog geen PDF-stageovereenkomst geüpload voor deze stagiair.');
            return;
        }

        const meta = PARTY_META[partyKey] || PARTY_META.student;
        signContext.studentId = studentId;
        signContext.partyKey = partyKey;
        signContext.onCompleteCallback = onComplete || refreshAllAgreementViews;

        document.getElementById('sc-sign-role-badge').textContent = `${meta.icon} Ondertekenen als ${meta.label}`;
        document.getElementById('sc-sign-title').textContent = `Handtekening ${meta.label}`;
        document.getElementById('sc-sign-subtitle').textContent = `Stageovereenkomst van ${student?.name || agreement.student_name || 'Stagiair'}`;

        // Vul automatisch de echte naam in van de persoon die op dat moment is ingelogd
        const cleanDummyLabel = (val) => {
            if (!val) return '';
            const s = String(val).trim();
            if (/^(stagebegeleider|admin)\s*(\(.*\))?$/i.test(s)) return '';
            return s.replace(/\s*\((Lokaal|Proefleerling|Lokale Proefomgeving)\)/ig, '').trim();
        };

        let defaultName = cleanDummyLabel(agreement.signatures?.[partyKey]?.signer_name || '');
        if (!defaultName) {
            const sb = getSupabase();
            const isAdminPage = window.location.pathname.includes('admin');

            if (partyKey === 'student') {
                defaultName = cleanDummyLabel(student?.name || localStorage.getItem('student_name') || '');
            } else if (partyKey === 'parent') {
                defaultName = '';
            } else if (partyKey === 'employer') {
                if (window.currentCompany?.contact_person) {
                    defaultName = cleanDummyLabel(window.currentCompany.contact_person);
                } else if (sb && (localStorage.getItem('company_id') || student?.company_id)) {
                    const compId = localStorage.getItem('company_id') || student?.company_id;
                    const { data: comp } = await sb.from('Bedrijven').select('contact_person,company_name').eq('id', compId).single();
                    defaultName = cleanDummyLabel(comp?.contact_person || comp?.company_name || localStorage.getItem('company_name') || '');
                } else {
                    defaultName = cleanDummyLabel(localStorage.getItem('company_name') || '');
                }
            } else if (partyKey === 'school') {
                // Bepaal wie er op dit moment is ingelogd (Admin of Stagebegeleider)
                if (isAdminPage) {
                    defaultName = cleanDummyLabel(localStorage.getItem('admin_name') || '');
                    const adminEmail = localStorage.getItem('admin_email');
                    if (!defaultName && sb && adminEmail) {
                        const { data: sup } = await sb.from('stagebegeleiders').select('name').ilike('email', adminEmail).single();
                        if (sup?.name) defaultName = cleanDummyLabel(sup.name);
                    }
                    if (!defaultName && sb?.auth?.getUser) {
                        try {
                            const { data: uData } = await sb.auth.getUser();
                            defaultName = cleanDummyLabel(uData?.user?.user_metadata?.name || '');
                        } catch (e) {}
                    }
                }

                // Als Stagebegeleider is ingelogd (of fallback vanuit Admin)
                if (!defaultName) {
                    const supId = localStorage.getItem('supervisor_id') || student?.supervisor_id;
                    const supEmail = localStorage.getItem('supervisor_email');
                    if (sb && supId) {
                        const { data: sup } = await sb.from('stagebegeleiders').select('name').eq('id', supId).single();
                        if (sup?.name) defaultName = cleanDummyLabel(sup.name);
                    }
                    if (!defaultName && sb && supEmail) {
                        const { data: sup } = await sb.from('stagebegeleiders').select('name').ilike('email', supEmail).single();
                        if (sup?.name) defaultName = cleanDummyLabel(sup.name);
                    }
                }

                if (!defaultName) {
                    defaultName = cleanDummyLabel(localStorage.getItem('supervisor_name') || localStorage.getItem('admin_name') || '');
                }
            }
        }

        const nameInput = document.getElementById('sc-signer-name-input');
        nameInput.value = defaultName;
        const previewText = document.getElementById('sc-typed-preview-text');
        if (previewText) previewText.textContent = defaultName || 'Typ hierboven je naam...';

        clearCanvas();
        switchSignMethod('draw');

        const previewBtn = document.getElementById('sc-sign-preview-pdf-btn');
        previewBtn.onclick = () => openPdfViewer(studentId, 'viewer');

        document.getElementById('sc-sign-modal').classList.remove('hidden');
    }

    function closeSignModal() {
        const m = document.getElementById('sc-sign-modal');
        if (m) m.classList.add('hidden');
    }

    async function submitSignature() {
        const nameInput = document.getElementById('sc-signer-name-input');
        const consent = document.getElementById('sc-sign-consent-checkbox');
        const btn = document.getElementById('sc-confirm-sign-btn');

        const signerName = (nameInput?.value || '').trim();
        if (!signerName) {
            alert('Vul eerst de naam van de ondertekenaar in.');
            nameInput?.focus();
            return;
        }
        if (!consent?.checked) {
            alert('Vink het akkoord-vakje aan om te ondertekenen.');
            return;
        }

        let signatureDataUrl = '';
        if (signContext.method === 'draw') {
            if (!signContext.hasDrawn) {
                alert('Teken eerst je handtekening in het vak (of kies het tabblad "⌨️ Typen" als je geen touchscreen hebt).');
                return;
            }
            const canvas = document.getElementById('sc-signature-canvas');
            signatureDataUrl = canvas.toDataURL('image/png');
        } else {
            signatureDataUrl = renderTypedSignatureToDataUrl(signerName);
        }

        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Handtekening op PDF plaatsen...';

        try {
            const student = await resolveStudent(signContext.studentId);
            const agreement = await fetchSingleAgreement(signContext.studentId);
            const existingBytes = await getAgreementPdfBytes(agreement);
            if (!existingBytes) {
                throw new Error('Kon het PDF-bestand niet laden.');
            }

            const nowIso = new Date().toISOString();
            const updatedPdfBytes = await stampSignatureIntoPdfBytes(
                existingBytes,
                signContext.partyKey,
                signerName,
                signatureDataUrl,
                nowIso,
                agreement.signature_boxes
            );

            const updatedSignatures = {
                ...(agreement.signatures || {}),
                [signContext.partyKey]: {
                    signer_name: signerName,
                    method: signContext.method,
                    signed_at: nowIso
                }
            };

            const signedCount = ['school', 'employer', 'student', 'parent'].filter(k => updatedSignatures[k]?.signed_at).length;
            const nextStatus = signedCount === 4 ? 'fully_signed' : 'partially_signed';

            await saveAgreementPdfAndRecord(student || { id: signContext.studentId, name: agreement.student_name }, updatedPdfBytes, agreement, {
                signatures: updatedSignatures,
                status: nextStatus
            });

            // Als alle 4 partijen getekend hebben, markeer contract_submitted = true bij Student
            if (signedCount === 4) {
                const sb = getSupabase();
                await sb.from('Students').update({ contract_submitted: true }).eq('id', signContext.studentId);
                localStorage.setItem('demo_contract_submitted_' + signContext.studentId, 'true');
            }

            closeSignModal();
            if (typeof signContext.onCompleteCallback === 'function') {
                await signContext.onCompleteCallback();
            }
        } catch (err) {
            console.error('Fout bij ondertekenen PDF:', err);
            alert('Er ging iets mis bij het plaatsen van de handtekening: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    }

    // Upload een eigen PDF uit het LVS
    async function handleFileUpload(studentId, file, roleLabel = 'School') {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('Selecteer een geldig PDF-bestand (.pdf).');
            return;
        }
        const buf = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(buf);
        const student = await resolveStudent(studentId);
        const existing = await fetchSingleAgreement(studentId);

        await saveAgreementPdfAndRecord(student, pdfBytes, existing, {
            status: 'pending_signatures',
            signatures: {},
            printed_by_admin_at: null,
            printed_by_supervisor_at: null,
            archived_at: null,
            uploaded_by: roleLabel
        });

        await refreshAllAgreementViews();
    }

    // Genereer een proef-PDF (zoals uit het LVS) om lokaal direct te testen
    async function createSamplePdfForStudent(studentId, roleLabel = 'School') {
        const student = await resolveStudent(studentId);
        if (!student) return;
        const pdfBytes = await generateSampleLvsPdfBytes(student);
        const existing = await fetchSingleAgreement(studentId);

        await saveAgreementPdfAndRecord(student, pdfBytes, existing, {
            status: 'pending_signatures',
            signatures: {},
            printed_by_admin_at: null,
            printed_by_supervisor_at: null,
            archived_at: null,
            uploaded_by: roleLabel
        });

        await refreshAllAgreementViews();
    }

    // Open de PDF viewer en registreer wanneer Admin of Begeleider op Print/Download klikt
    async function openPdfViewer(studentId, roleContext = 'viewer') {
        ensureModalsInDom();
        const agreement = await fetchSingleAgreement(studentId);
        if (!agreement) {
            alert('Geen stageovereenkomst gevonden.');
            return;
        }
        if (agreement.status === 'archived_avg') {
            alert('Deze PDF is na het printen al veilig gewist conform de AVG.');
            return;
        }

        const blobUrl = await createAgreementPdfBlobUrl(agreement);
        if (!blobUrl) {
            alert('Het PDF-bestand kon niet worden geladen.');
            return;
        }

        const signedCount = countSignatures(agreement);
        document.getElementById('sc-viewer-title').textContent = `📄 Stageovereenkomst - ${agreement.student_name || 'Stagiair'}`;
        document.getElementById('sc-viewer-subtitle').textContent = `${signedCount}/4 handtekeningen geplaatst`;

        const iframe = document.getElementById('sc-pdf-iframe');
        iframe.src = blobUrl;

        const printBtn = document.getElementById('sc-viewer-print-btn');
        printBtn.onclick = async () => {
            await markPrintedAndTriggerPrint(studentId, roleContext, blobUrl);
        };

        document.getElementById('sc-pdf-viewer-modal').classList.remove('hidden');
    }

    function closePdfViewer() {
        const modal = document.getElementById('sc-pdf-viewer-modal');
        const iframe = document.getElementById('sc-pdf-iframe');
        if (iframe) iframe.src = 'about:blank';
        if (modal) modal.classList.add('hidden');
    }

    async function markPrintedAndTriggerPrint(studentId, roleContext, existingBlobUrl) {
        const sb = getSupabase();
        const agreement = await fetchSingleAgreement(studentId);
        if (!agreement) return;

        const blobUrl = existingBlobUrl || await createAgreementPdfBlobUrl(agreement);
        if (!blobUrl) return;

        const nowIso = new Date().toISOString();
        const isAdmin = roleContext === 'admin' || !!localStorage.getItem('stageconnect_admin_session');
        const updateFields = isAdmin
            ? { printed_by_admin_at: nowIso, updated_at: nowIso }
            : { printed_by_supervisor_at: nowIso, updated_at: nowIso };

        let updatedMain = false;
        try {
            const { error } = await sb.from('Stageovereenkomsten').update(updateFields).eq('id', agreement.id);
            if (!error) updatedMain = true;
        } catch (e) {}

        if (!updatedMain) {
            try {
                const updatedRec = { ...agreement, ...updateFields };
                delete updatedRec._fb_row_id;
                await sb.from('push_subscriptions')
                    .update({ subscription: updatedRec, updated_at: nowIso })
                    .eq('student_id', studentId)
                    .eq('user_agent', FALLBACK_USER_AGENT);
            } catch (e) {}
        }

        // Open de PDF in een print-/downloadvenster
        const iframe = document.getElementById('sc-pdf-iframe');
        if (iframe && iframe.contentWindow && existingBlobUrl) {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                window.open(blobUrl, '_blank');
            }
        } else {
            const win = window.open(blobUrl, '_blank');
            if (!win) {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Stageovereenkomst_${(agreement.student_name || 'Stagiair').replace(/\s+/g, '_')}.pdf`;
                a.click();
            }
        }

        await refreshAllAgreementViews();
    }

    // AVG-Veiligheidsslot: Alleen Admin mag PDF wissen, en alleen nadat geprint is
    let avgDeleteStudentId = null;
    async function openAvgDeleteModal(studentId) {
        ensureModalsInDom();
        if (!localStorage.getItem('stageconnect_admin_session')) {
            alert('Alleen de Admin mag een ondertekende PDF definitief wissen.');
            return;
        }
        const agreement = await fetchSingleAgreement(studentId);
        if (!agreement) return;

        if (!agreement.printed_by_admin_at) {
            alert('🔒 Veiligheidsslot: Klik eerst op "🖨️ Print / Download PDF" voordat je de PDF kunt wissen.');
            return;
        }

        avgDeleteStudentId = studentId;
        document.getElementById('sc-avg-delete-student-label').textContent = `Stagiair: ${agreement.student_name} (${countSignatures(agreement)}/4 handtekeningen)`;
        const cb = document.getElementById('sc-avg-confirm-printed-checkbox');
        const btn = document.getElementById('sc-avg-confirm-delete-btn');
        if (cb) cb.checked = false;
        if (btn) btn.disabled = true;

        document.getElementById('sc-avg-delete-modal').classList.remove('hidden');
    }

    async function confirmAvgDeletePdf() {
        if (!avgDeleteStudentId) return;
        const sb = getSupabase();
        const agreement = await fetchSingleAgreement(avgDeleteStudentId);
        if (!agreement) return;

        // 1. Verwijder PDF bestand uit Storage
        if (agreement.storage_path) {
            try {
                await fetch(`${window.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${agreement.storage_path}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_KEY}`
                    }
                });
            } catch (e) {}
        }

        // 2. Wis de PDF-bytes uit het database-record en zet status op 'archived_avg'
        const nowIso = new Date().toISOString();
        const archiveFields = {
            pdf_base64: null,
            storage_path: null,
            status: 'archived_avg',
            archived_at: nowIso,
            updated_at: nowIso
        };
        let archivedMain = false;
        try {
            const { error } = await sb.from('Stageovereenkomsten').update(archiveFields).eq('id', agreement.id);
            if (!error) archivedMain = true;
        } catch (e) {}

        if (!archivedMain) {
            try {
                const updatedRec = { ...agreement, ...archiveFields };
                delete updatedRec._fb_row_id;
                await sb.from('push_subscriptions')
                    .update({ subscription: updatedRec, updated_at: nowIso })
                    .eq('student_id', avgDeleteStudentId)
                    .eq('user_agent', FALLBACK_USER_AGENT);
            } catch (e) {}
        }

        // 3. Zet contract_submitted op true bij de student
        await sb.from('Students').update({ contract_submitted: true }).eq('id', avgDeleteStudentId);
        localStorage.setItem('demo_contract_submitted_' + avgDeleteStudentId, 'true');

        document.getElementById('sc-avg-delete-modal').classList.add('hidden');
        avgDeleteStudentId = null;
        await refreshAllAgreementViews();
    }

    // ============================================================================
    // RENDER FUNCTIES PER PORTAAL
    // ============================================================================

    // 1. STAGIAIR PORTAAL (student-portal.html): Stagiair én Ouder/Verzorger tekenen hier
    async function renderStudentPortalCard(student) {
        if (!student) return;
        registerStudents([student]);
        ensureModalsInDom();

        let host = document.getElementById('sc-student-agreement-card');
        const contentEl = document.getElementById('content');
        if (!host && contentEl) {
            host = document.createElement('div');
            host.id = 'sc-student-agreement-card';
            contentEl.insertBefore(host, contentEl.firstChild);
        }
        if (!host) return;

        const agreement = await fetchSingleAgreement(student.id);
        const missingBanner = document.getElementById('contract-missing-banner');

        if (!agreement) {
            host.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl p-5 border-2 border-indigo-100">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📄</span>
                            <div>
                                <h3 class="font-extrabold text-gray-900 text-base">Digitale Stageovereenkomst</h3>
                                <p class="text-xs text-gray-500">Zodra je stagebegeleider je stageovereenkomst klaarzet, kun je deze hier samen met je ouder/verzorger digitaal ondertekenen.</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Nog niet klaargezet door school</span>
                    </div>
                </div>
            `;
            return;
        }

        if (agreement.status === 'archived_avg') {
            if (missingBanner) missingBanner.classList.add('hidden');
            host.innerHTML = `
                <div class="bg-emerald-50 rounded-2xl shadow-md p-5 border-2 border-emerald-300 flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">✅</span>
                        <div>
                            <h3 class="font-extrabold text-emerald-950 text-base">Stageovereenkomst volledig ondertekend & geregistreerd</h3>
                            <p class="text-xs text-emerald-800 mt-0.5">
                                Alle 4 partijen hebben getekend. De overeenkomst is door school geprint voor het LVS (PDF is conform AVG verwijderd uit de app op ${formatDutchDateTime(agreement.archived_at)}).
                            </p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const signedCount = countSignatures(agreement);
        if (signedCount === 4 && missingBanner) {
            missingBanner.classList.add('hidden');
        }

        host.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-6 border-2 ${signedCount === 4 ? 'border-emerald-300' : 'border-indigo-200'}">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xl">📄</span>
                            <h3 class="font-black text-gray-900 text-lg">Mijn Stageovereenkomst (${signedCount}/4 getekend)</h3>
                        </div>
                        <p class="text-xs text-gray-500 mt-0.5">
                            Onderteken hieronder zelf als <strong>Stagiair</strong> én laat je <strong>Ouder/Verzorger</strong> meetekenen (met vinger/muis of door de naam te typen).
                        </p>
                    </div>
                    <button type="button" onclick="window.StageAgreements.openPdfViewer('${student.id}', 'student')"
                        class="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition shrink-0">
                        👁️ Bekijk PDF overeenkomst
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${renderSignatureBadgesHtml(agreement, { canSignParties: ['student', 'parent'], studentId: student.id })}
                </div>
            </div>
        `;
    }

    // 2. STAGEBEDRIJF PORTAAL (employer-portal.html): Werkgever tekent hier
    async function renderEmployerPortalSection(studentsList) {
        if (!Array.isArray(studentsList) || studentsList.length === 0) return;
        registerStudents(studentsList);
        ensureModalsInDom();

        let host = document.getElementById('sc-employer-agreements-section');
        const mainEl = document.querySelector('main');
        if (!host && mainEl) {
            host = document.createElement('div');
            host.id = 'sc-employer-agreements-section';
            host.className = 'mb-8';
            const supervisorPanel = mainEl.children[1];
            mainEl.insertBefore(host, supervisorPanel ? supervisorPanel.nextSibling : mainEl.firstChild);
        }
        if (!host) return;

        const agreements = await fetchAgreementsForStudents(studentsList.map(s => s.id));
        if (agreements.length === 0) {
            host.innerHTML = '';
            return;
        }

        const cardsHtml = agreements.map(agr => {
            const student = studentsList.find(s => String(s.id) === String(agr.student_id));
            const sName = student?.name || agr.student_name || 'Stagiair';

            if (agr.status === 'archived_avg') {
                return `
                    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">✅</span>
                            <div>
                                <div class="font-bold text-emerald-950 text-sm">${sName} — Stageovereenkomst volledig afgerond</div>
                                <div class="text-xs text-emerald-800">Alle 4 partijen hebben getekend en school heeft het contract gearchiveerd (${formatDutchDateTime(agr.archived_at)}).</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            const signedCount = countSignatures(agr);
            const employerSigned = !!(agr.signatures?.employer?.signed_at);

            return `
                <div class="p-5 rounded-2xl bg-white border-2 ${employerSigned ? 'border-emerald-200' : 'border-blue-300'} shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold ${employerSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                                    ${signedCount}/4 handtekeningen
                                </span>
                                <h4 class="font-black text-gray-900 text-base">Stageovereenkomst: ${sName}</h4>
                            </div>
                            <p class="text-xs text-gray-500 mt-0.5">
                                ${employerSigned ? 'Bedankt! Uw handtekening namens het stagebedrijf staat op de PDF.' : 'Controleer de stageovereenkomst en plaats uw digitale handtekening namens het stagebedrijf.'}
                            </p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <button type="button" onclick="window.StageAgreements.openPdfViewer('${agr.student_id}', 'employer')"
                                class="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition">
                                👁️ Bekijk PDF
                            </button>
                            <button type="button" onclick="window.StageAgreements.openSignModal('${agr.student_id}', 'employer')"
                                class="px-4 py-2 rounded-xl ${employerSigned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-extrabold text-xs shadow-sm transition">
                                ✍️ ${employerSigned ? 'Handtekening wijzigen' : 'Onderteken als Stagebedrijf'}
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        ${renderSignatureBadgesHtml(agr, { canSignParties: ['employer'], studentId: agr.student_id })}
                    </div>
                </div>
            `;
        }).join('');

        host.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="font-black text-gray-900 text-base flex items-center gap-2">
                        <span>📄</span> Stageovereenkomsten (Digitaal ondertekenen)
                    </h3>
                </div>
                ${cardsHtml}
            </div>
        `;
    }

    // 3. BEGELEIDER & ADMIN: Rijke kaart voor 1 specifieke stagiair (bijv. in #modal-contract-block)
    async function renderStudentAgreementManagerBlock(containerEl, student, role = 'supervisor') {
        if (!containerEl || !student) return;
        registerStudents([student]);
        ensureModalsInDom();

        containerEl.classList.remove('hidden');
        containerEl.className = 'mb-5 p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3';

        const agreement = await fetchSingleAgreement(student.id);
        const isAdmin = role === 'admin' || !!localStorage.getItem('stageconnect_admin_session');
        const fileInputId = `sc-pdf-upload-${student.id}-${role}`;

        if (!agreement) {
            containerEl.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="text-xs font-extrabold uppercase tracking-wider text-indigo-900">📄 Stageovereenkomst (PDF uit LVS)</div>
                        <p class="text-xs text-slate-600 mt-0.5">
                            Nog geen stageovereenkomst geüpload voor <strong>${student.name}</strong>.
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <input type="file" id="${fileInputId}" accept="application/pdf" class="hidden"
                            onchange="window.StageAgreements.handleFileUpload('${student.id}', this.files[0], '${isAdmin ? 'Admin' : 'Stagebegeleider'}')" />
                        <button type="button" onclick="document.getElementById('${fileInputId}').click()"
                            class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition">
                            📤 Upload PDF uit LVS
                        </button>
                        ${(window.IS_LOCAL_STAGING || window.SCHOOL_CONFIG?.id === 'demo') ? `
                        <button type="button" onclick="window.StageAgreements.createSamplePdfForStudent('${student.id}', '${isAdmin ? 'Admin' : 'Stagebegeleider'}')"
                            class="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold text-xs shadow-sm transition"
                            title="Maakt direct een realistische LVS-stageovereenkomst PDF aan om het ondertekenen te testen">
                            ✨ Genereer proef-PDF
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
            return;
        }

        if (agreement.status === 'archived_avg') {
            containerEl.className = 'mb-5 p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 space-y-2';
            containerEl.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-900">✅ Stageovereenkomst Afgerond & AVG-gearchiveerd</div>
                        <p class="text-xs text-emerald-800 mt-0.5">
                            Alle 4 partijen hebben getekend. De PDF is geprint voor het LVS en op <strong>${formatDutchDateTime(agreement.archived_at)}</strong> door de Admin gewist uit StageConnectie (geen adresgegevens meer opgeslagen).
                        </p>
                    </div>
                    <div>
                        <input type="file" id="${fileInputId}" accept="application/pdf" class="hidden"
                            onchange="window.StageAgreements.handleFileUpload('${student.id}', this.files[0], '${isAdmin ? 'Admin' : 'Stagebegeleider'}')" />
                        <button type="button" onclick="document.getElementById('${fileInputId}').click()"
                            class="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold">
                            📤 Nieuwe PDF uploaden
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    ${renderSignatureBadgesHtml(agreement, { canSignParties: [], studentId: student.id })}
                </div>
            `;
            return;
        }

        const signedCount = countSignatures(agreement);
        const adminPrinted = !!agreement.printed_by_admin_at;

        containerEl.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-200/70">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-indigo-950">📄 Stageovereenkomst (PDF)</span>
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold ${signedCount === 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${signedCount}/4 ondertekend
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-0.5">
                        ${signedCount === 4 ? '🎉 Alle 4 partijen hebben getekend! Klaar om te printen voor het LVS.' : 'Klik op "✍️ Tekenen" bij School om namens school te ondertekenen.'}
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <button type="button" onclick="window.StageAgreements.openPdfViewer('${student.id}', '${isAdmin ? 'admin' : 'supervisor'}')"
                        class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs shadow-sm">
                        👁️ Bekijk PDF
                    </button>
                    <button type="button" onclick="window.StageAgreements.markPrintedAndTriggerPrint('${student.id}', '${isAdmin ? 'admin' : 'supervisor'}')"
                        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm">
                        🖨️ Print / Download
                    </button>
                    <input type="file" id="${fileInputId}" accept="application/pdf" class="hidden"
                        onchange="window.StageAgreements.handleFileUpload('${student.id}', this.files[0], '${isAdmin ? 'Admin' : 'Stagebegeleider'}')" />
                    <button type="button" onclick="document.getElementById('${fileInputId}').click()"
                        class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[11px]"
                        title="Vervang door een andere PDF">
                        📤 Vervang
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${renderSignatureBadgesHtml(agreement, { canSignParties: ['school'], studentId: student.id })}
            </div>

            <!-- AVG Veiligheidsbalk onderaan -->
            <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] border-t border-indigo-200/60">
                ${isAdmin ? `
                    <div class="text-slate-600">
                        🔒 <strong>AVG-beveiliging (Admin):</strong> ${adminPrinted
                            ? `<span class="text-emerald-700 font-bold">Geprint op ${formatDutchDateTime(agreement.printed_by_admin_at)} — je kunt de PDF nu veilig wissen.</span>`
                            : 'Print/download de PDF eerst voordat het wissen-slot ontgrendeld wordt.'}
                    </div>
                    <button type="button" onclick="window.StageAgreements.openAvgDeleteModal('${student.id}')"
                        ${adminPrinted ? '' : 'disabled'}
                        class="px-3 py-1.5 rounded-lg font-extrabold text-xs transition shrink-0 ${adminPrinted
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                        title="${adminPrinted ? 'Wis het PDF-bestand definitief uit StageConnectie' : 'Klik eerst op Print / Download om dit veiligheidsslot te ontgrendelen'}">
                        🗑️ ${adminPrinted ? 'PDF definitief wissen (AVG)' : '🔒 Wis PDF (Eerst printen)'}
                    </button>
                ` : `
                    <div class="text-slate-500">
                        🔒 <strong>AVG-beveiliging:</strong> Jij kunt de ondertekende PDF hier altijd inzien en printen. Alleen de Admin kan de PDF na het printen definitief wissen.
                    </div>
                `}
            </div>
        `;
    }

    // Open het centrale overzicht-venster voor Admin of Stagebegeleider
    async function openAgreementsOverviewModal(role = 'admin', filterStudentId = null) {
        ensureModalsInDom();
        const modal = document.getElementById('sc-agreements-overview-modal');
        const listEl = document.getElementById('sc-agreements-overview-list');
        modal.classList.remove('hidden');
        listEl.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Stageovereenkomsten laden...</div>';

        const sb = getSupabase();
        const { data: allStudents } = await sb.from('Students').select('*').order('name');
        let studentsToShow = allStudents || [];

        // Als stagebegeleider ingelogd is, filter op eigen studenten
        const isAdmin = role === 'admin' || !!localStorage.getItem('stageconnect_admin_session');
        const supId = localStorage.getItem('supervisor_id');
        if (!isAdmin && supId) {
            studentsToShow = studentsToShow.filter(s => String(s.supervisor_id) === String(supId));
        }
        if (filterStudentId) {
            studentsToShow = studentsToShow.filter(s => String(s.id) === String(filterStudentId));
        }

        registerStudents(studentsToShow);
        listEl.innerHTML = '';

        if (studentsToShow.length === 0) {
            listEl.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm">Geen stagiairs gevonden.</div>';
            return;
        }

        for (const student of studentsToShow) {
            const wrapper = document.createElement('div');
            wrapper.className = 'bg-white rounded-2xl border border-slate-200 p-4 shadow-sm';
            const header = document.createElement('div');
            header.className = 'font-black text-slate-900 text-base mb-2 flex items-center justify-between';
            header.innerHTML = `<span>🎓 ${student.name} <span class="text-xs font-normal text-slate-500">(${student.class || '-'} • ${student.email || '-'})</span></span>`;
            const body = document.createElement('div');
            body.id = `sc-overview-student-${student.id}`;
            wrapper.appendChild(header);
            wrapper.appendChild(body);
            listEl.appendChild(wrapper);
            await renderStudentAgreementManagerBlock(body, student, isAdmin ? 'admin' : 'supervisor');
        }
    }

    // Ververs alle zichtbare agreement blokken op de huidige pagina
    async function refreshAllAgreementViews() {
        // 1. Stagiair portaal
        if (window.currentStudent && document.getElementById('student-week-row')) {
            await renderStudentPortalCard(window.currentStudent);
        }
        // 2. Werkgever portaal
        if (document.getElementById('students-grid') && window.students && Array.isArray(window.students)) {
            await renderEmployerPortalSection(window.students);
        }
        // 3. Begeleider portaal modal
        const supModalBlock = document.getElementById('modal-contract-block');
        if (supModalBlock && window.currentStudent && !document.getElementById('student-modal')?.classList.contains('hidden')) {
            await renderStudentAgreementManagerBlock(supModalBlock, window.currentStudent, 'supervisor');
        }
        // 4. Openstaande overview modal
        const overviewModal = document.getElementById('sc-agreements-overview-modal');
        if (overviewModal && !overviewModal.classList.contains('hidden')) {
            const isAdmin = !!localStorage.getItem('stageconnect_admin_session');
            await openAgreementsOverviewModal(isAdmin ? 'admin' : 'supervisor');
        }
    }

    // Zorg dat oude lokale test-labels in localStorage direct vervangen worden door de echte naam
    if (window.IS_LOCAL_STAGING) {
        if (localStorage.getItem('supervisor_name') === 'Stagebegeleider (Lokaal)') {
            localStorage.setItem('supervisor_name', 'Willemien Vesseur');
        }
        if (localStorage.getItem('admin_name') === 'Admin (Lokale Proefomgeving)' || localStorage.getItem('admin_name') === 'Willemien Vesseur (Lokaal)') {
            localStorage.setItem('admin_name', 'Willemien Vesseur');
        }
    }

    // Publieke API op window.StageAgreements
    window.StageAgreements = {
        fetchAgreementsForStudents,
        fetchSingleAgreement,
        renderStudentPortalCard,
        renderEmployerPortalSection,
        renderStudentAgreementManagerBlock,
        openAgreementsOverviewModal,
        openSignModal,
        closeSignModal,
        switchSignMethod,
        clearCanvas,
        submitSignature,
        handleFileUpload,
        createSamplePdfForStudent,
        openPdfViewer,
        closePdfViewer,
        markPrintedAndTriggerPrint,
        openAvgDeleteModal,
        confirmAvgDeletePdf,
        refreshAllAgreementViews
    };
})();
