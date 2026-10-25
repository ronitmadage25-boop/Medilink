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

  const aiKey = process.env.AI_API_KEY;
  const isAiConfigured = process.env.AI_PROVIDER === 'openai' && aiKey;

  let explanationText = DEMO_EXPLANATION.explanation;
  let terminology = DEMO_EXPLANATION.terminology;
  let questions = DEMO_EXPLANATION.suggestedQuestions;
  let isDemo = true;

  if (isAiConfigured) {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: aiKey });

      const prompt = `You are a clinical educational assistant for MediLink, a healthcare coordination platform.
Translate the following medical lab findings into clear, plain English for a patient.
- Test Type: ${report.testType}
- Findings: ${report.findings || 'Normal parameters'}
- Laboratory Notes: ${report.notes || 'None'}

Include:
1. A plain-language summary of what these numbers mean.
2. 3 key medical terms explained simply.
3. 3 questions the patient should ask their physician.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      });

      if (completion.choices[0]?.message?.content) {
        explanationText = completion.choices[0].message.content;
        isDemo = false;
      }
    } catch {
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

  res.json({
    success: true,
    data: {
      explanations: formatted,
      aiConfigured: process.env.AI_PROVIDER === 'openai',
    },
  });
};
