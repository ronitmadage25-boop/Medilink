import { Response } from 'express';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { AIExplanation } from '../models/AIExplanation';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';
import mongoose from 'mongoose';

const DEMO_EXPLANATION = {
  explanation:
    'This is a demonstration AI explanation. Your report contains standard laboratory values within the normal reference ranges for most parameters. There are some findings that your doctor will discuss with you during your next consultation.',
  terminology: [
    { term: 'Haemoglobin', definition: 'A protein in red blood cells that carries oxygen throughout the body.' },
    { term: 'Platelets', definition: 'Tiny blood cells that help your body form clots to stop bleeding.' },
    { term: 'WBC', definition: 'White blood cells that are part of the immune system and fight infection.' },
  ],
  suggestedQuestions: [
    'Are any of my results outside the normal range?',
    'Do I need a follow-up test?',
    'Are there any lifestyle changes you recommend based on these results?',
    'When should I come back for a check-up?',
  ],
};

export const requestExplanation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reportId } = req.body as { reportId: string };

  if (!mongoose.isValidObjectId(reportId)) throw new AppError('Invalid report ID.', 400);

  const report = await DiagnosticReport.findById(reportId).lean();
  if (!report || !report.isActive) throw new AppError('Report not found.', 404);

  // Verify patient owns this report
  if (report.patient.toString() !== req.user!._id.toString()) {
    throw new AppError('You can only request explanations for your own reports.', 403);
  }

  // Check for existing explanation
  const existing = await AIExplanation.findOne({ report: reportId, patient: req.user!._id }).lean();
  if (existing) {
    res.json({ success: true, data: { explanation: existing } });
    return;
  }

  const isConfigured = config.aiProvider !== 'none' && config.aiApiKey;

  if (isConfigured) {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: config.aiApiKey });

      const prompt = `You are a medical report explainer assistant for MediLink, a healthcare platform. 
A patient has shared their diagnostic report details with you. Your role is to explain the report in plain language.
Important guidelines:
- Do NOT diagnose any disease
- Do NOT prescribe or recommend medications
- Encourage the patient to discuss findings with their doctor
- Use simple, clear language
- Report type: ${report.testType}
- Findings: ${report.findings || 'Not provided'}
- Notes: ${report.notes || 'Not provided'}

Please provide:
1. A plain-language explanation of the report
2. Key medical terms explained simply
3. Questions the patient should ask their doctor`;

      const completion = await openai.chat.completions.create({
        model: config.aiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });

      const text = completion.choices[0]?.message?.content || '';

      const explanation = await AIExplanation.create({
        patient: req.user!._id,
        report: reportId,
        explanation: text,
        terminology: DEMO_EXPLANATION.terminology,
        suggestedQuestions: DEMO_EXPLANATION.suggestedQuestions,
        provider: config.aiProvider,
        aiModel: config.aiModel,
        isDemo: false,
      });

      res.json({ success: true, data: { explanation } });
      return;
    } catch (err) {
      // Fall through to demo if AI call fails
    }
  }

  // Demo mode
  const explanation = await AIExplanation.create({
    patient: req.user!._id,
    report: reportId,
    explanation: DEMO_EXPLANATION.explanation,
    terminology: DEMO_EXPLANATION.terminology,
    suggestedQuestions: DEMO_EXPLANATION.suggestedQuestions,
    provider: 'demo',
    isDemo: true,
  });

  res.json({
    success: true,
    data: { explanation },
    notice: isConfigured
      ? 'The AI provider encountered an error. Showing a demonstration explanation.'
      : 'AI provider is not configured. This is a demonstration explanation. Configure AI_PROVIDER and AI_API_KEY in your server environment to enable real AI analysis.',
  });
};

export const getExplanationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const explanations = await AIExplanation.find({ patient: req.user!._id })
    .populate('report', 'testType testDate')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({ success: true, data: { explanations, aiConfigured: config.aiProvider !== 'none' } });
};
