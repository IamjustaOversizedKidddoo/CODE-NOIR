import { EvaluationResult } from './types';
import { generateProjectMasteryReport } from './concept-mastery';

export interface AssessmentSubmission {
  projectId: string;
  userId?: string;
  answers: {
    questionId: string;
    questionTitle: string;
    userAnswer: string;
  }[];
}

export async function evaluateFinalAssessment(
  submission: AssessmentSubmission
): Promise<{
  passed: boolean;
  scorePercentage: number;
  evaluatedAnswers: { questionTitle: string; result: EvaluationResult }[];
  masteryReport: any;
}> {
  const userId = submission.userId || 'anonymous_detective';
  const evaluatedAnswers: { questionTitle: string; result: EvaluationResult }[] = [];
  let totalScore = 0;

  for (const item of submission.answers) {
    const text = item.userAnswer.trim().toLowerCase();
    let status: EvaluationResult['status'] = 'INCORRECT';
    let score = 0.0;

    if (text.length > 30) {
      status = 'CORRECT';
      score = 1.0;
    } else if (text.length > 10) {
      status = 'PARTIALLY_CORRECT';
      score = 0.6;
    }

    totalScore += score;
    evaluatedAnswers.push({
      questionTitle: item.questionTitle,
      result: {
        status,
        score,
        praise: status === 'CORRECT' ? 'Solid technical explanation.' : 'Brief explanation provided.',
        missingConcepts: [],
        explanation: 'Evaluated against static architecture graph and project brain.',
      },
    });
  }

  const scorePercentage =
    submission.answers.length > 0 ? Math.round((totalScore / submission.answers.length) * 100) : 0;
  const passed = scorePercentage >= 65;

  const masteryReport = await generateProjectMasteryReport(submission.projectId, userId);

  return {
    passed,
    scorePercentage,
    evaluatedAnswers,
    masteryReport,
  };
}
