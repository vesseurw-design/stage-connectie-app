import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, Student, Employer, AttendanceStatus } from "../types";

// Initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateInternshipReport = async (
  student: Student,
  employer: Employer,
  attendance: AttendanceRecord[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI configuratie ontbreekt. Controleer uw API key.";

  const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
  const sickCount = attendance.filter(a => a.status === AttendanceStatus.SICK).length;
  const absentCount = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
  const lateCount = attendance.filter(a => a.status === AttendanceStatus.LATE).length;

  const prompt = `
    Je bent een professionele onderwijsassistent. Schrijf een korte, formele voortgangsrapportage voor de stage van een leerling.
    
    Gegevens:
    - Leerling: ${student.name}
    - Stagebedrijf: ${employer.companyName}
    - Totaal geregistreerde dagen: ${attendance.length}
    - Aanwezig: ${presentCount}
    - Ziek: ${sickCount}
    - Ongeoorloofd afwezig: ${absentCount}
    - Te laat: ${lateCount}

    Instructie:
    Schrijf een samenvatting van maximaal 150 woorden voor het schooldossier. Analyseer de betrouwbaarheid van de leerling op basis van de cijfers. Wees opbouwend maar eerlijk. Schrijf in het Nederlands.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Kon geen rapport genereren.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Er is een fout opgetreden bij het genereren van het rapport.";
  }
};

export const generateAbsenceEmail = async (
  student: Student,
  lastRecord: AttendanceRecord
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI configuratie ontbreekt.";

  const prompt = `
    Schrijf een korte, zakelijke e-mail draft aan de leerling ${student.name} betreffende hun afwezigheid.
    De leerling was op ${lastRecord.date} geregistreerd als: ${lastRecord.status}.
    Opmerking werkgever: ${lastRecord.notes || 'Geen opmerking'}.
    
    De toon moet bezorgd maar streng zijn. Vraag om opheldering of beterschap indien ziek.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || "Kon geen email genereren.";
  } catch (error) {
      console.error("Gemini Error:", error);
      return "Fout bij genereren email.";
  }
};
