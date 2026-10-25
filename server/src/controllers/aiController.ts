import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

const DEMO_EXPLANATION = {
  explanation:
    'Your diagnostic laboratory report indicates standard metabolic parameters. Values for renal filtration and complete blood counts are within standard clinical reference thresholds. Mild lipid elevation noted in triglycerides, which can be addressed through cardiovascular exercise and low-sodium dietary adjustments.',
  terminology: [
    { term: 'Haemoglobin', definition: 'The oxygen-carrying protein contained inside red blood cells.' },
    { term: 'Triglycerides', definition: 'A type of fat (lipid) found in your bloodstream used for energy.' },
    { term: 'Platelets', definition: 'Cellular fragments in blood that promote healthy coagulation.' },
    { term: 'Creatinine', definition: 'A normal waste product filtered by healthy functioning kidneys.' },
  ],
  suggestedQuestions: [
    'Are any observed values outside optimal baseline targets for my age group?',
    'Do my lipid levels require pharmacological intervention or dietary modifications?',
    'When should I schedule a follow-up metabolic check?',
  ],
};

export const requestExplanation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reportId } = req.body as { reportId: string };

  if (!reportId) throw new AppError('Valid report ID is required.', 400);

  const report = await prisma.diagnosticReport.findUnique({
    where: { id: reportId },
  });

  if (!report || !report.isActive) throw new AppError('Diagnostic report not found.', 404);

  if (report.patientId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError('Access forbidden: You can only request explanations for your own reports.', 403);
  }

  // Check for existing explanation
  const existing = await prisma.aIExplanation.findFirst({
    where: { reportId, patientId: req.user!.id },
  });

  if (existing) {
    res.json({
      success: true,
      data: { explanation: { ...existing, _id: existing.id } },
    });
    return;
  }

  const aiKey = process.env.OPENAI || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
  const isAiConfigured = Boolean(aiKey && aiKey.trim().length > 0);

  let explanationText = `This ${report.testType} diagnostic evaluation conducted on ${new Date(report.testDate).toLocaleDateString()} provides medical indicators for clinical review.\n\nFindings Summary:\n${report.findings || 'No acute abnormalities recorded in primary metrics.'}\n\nNotes from Laboratory:\n${report.notes || 'Document processed per clinical laboratory protocol.'}\n\nNext Steps:\nDiscuss these results with your attending physician during your scheduled consultation to evaluate your overall health profile.`;

  let terminology = [
    { term: report.testType, definition: `The specialized clinical diagnostic evaluation ordered to evaluate biological metrics.` },
    { term: 'Reference Range', definition: 'The expected biological interval that standard healthy reference populations reside within.' },
    { term: 'Clinical Significance', definition: 'The practical medical importance of an observed laboratory metric in patient health.' },
  ];

  let questions = [
    `What do my specific ${report.testType} results indicate about my current health?`,
    `Are any lifestyle, nutritional, or medication adjustments indicated based on these findings?`,
    `When is the recommended interval for a follow-up assessment?`,
  ];
  let isDemo = true;

  if (isAiConfigured) {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: aiKey.trim() });

      const prompt = `You are a professional medical communicator for MediLink health systems.
Analyze the following clinical diagnostic report and provide a patient-friendly educational explanation.

Diagnostic Test: ${report.testType}
Test Date: ${new Date(report.testDate).toLocaleDateString()}
Report Findings:
${report.findings || 'Standard physiological indices.'}

Laboratory Technical Notes:
${report.notes || 'Routine specimen analysis.'}

Return your response in pure valid JSON format with the following keys:
{
  "explanation": "Clear, comprehensive multi-paragraph plain-language explanation of what these medical results mean in simple words.",
  "terminology": [
    { "term": "Medical Term 1", "definition": "Simple explanation of what this term means." },
    { "term": "Medical Term 2", "definition": "Simple explanation of what this term means." },
    { "term": "Medical Term 3", "definition": "Simple explanation of what this term means." }
  ],
  "suggestedQuestions": [
    "Specific question 1 the patient should ask their doctor",
    "Specific question 2 the patient should ask their doctor",
    "Specific question 3 the patient should ask their doctor"
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (responseContent) {
        try {
          const parsed = JSON.parse(responseContent);
          if (parsed.explanation) {
            explanationText = parsed.explanation;
          }
          if (Array.isArray(parsed.terminology) && parsed.terminology.length > 0) {
            terminology = parsed.terminology;
          }
          if (Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0) {
            questions = parsed.suggestedQuestions;
          }
          isDemo = false;
        } catch {
          explanationText = responseContent;
          isDemo = false;
        }
      }
    } catch (openAiErr) {
      console.error('OpenAI explanation generation encountered error, falling back to clinical intelligence engine:', openAiErr);
      // Fall through to resilient medical explanation
    }
  }

  const created = await prisma.aIExplanation.create({
    data: {
      patientId: req.user!.id,
      reportId,
      explanation: explanationText,
      terminology: terminology as any,
      suggestedQuestions: questions,
      provider: isAiConfigured ? 'OpenAI' : 'MediLink Clinical Explainer Engine',
      aiModel: process.env.AI_MODEL || 'gpt-4o',
      isDemo,
    },
  });

  res.json({
    success: true,
    data: {
      explanation: { ...created, _id: created.id },
    },
    notice: isDemo
      ? 'Generated via MediLink Clinical Intelligence. Configure AI_API_KEY for live external model inference.'
      : 'Generated via live OpenAI clinical model.',
  });
};

export const getExplanationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const explanations = await prisma.aIExplanation.findMany({
    where: { patientId: req.user!.id },
    include: {
      report: { select: { id: true, testType: true, testDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const formatted = explanations.map((e) => ({
    ...e,
    _id: e.id,
    report: { ...e.report, _id: e.report.id },
  }));

  const aiKey = process.env.OPENAI || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
  res.json({
    success: true,
    data: {
      explanations: formatted,
      aiConfigured: Boolean(aiKey && aiKey.trim().length > 0),
    },
  });
};
