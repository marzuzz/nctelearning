"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiUrl, withAuthHeaders } from "@/lib/api";

type QuizQuestion = {
  id: string;
  questionText: string;
  questionType: "multiple_choice" | "essay";
  orderIndex: number;
  points: number;
  options?: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
    orderIndex: number;
  }>;
};

type QuizAttemptAnswer = {
  id: string;
  questionId: string;
  selectedOptionId?: string;
  answerText?: string;
  pointsEarned: number;
  isCorrect?: boolean;
  feedback?: string;
  question: QuizQuestion;
  selectedOption?: {
    id: string;
    optionText: string;
  };
};

type QuizAttempt = {
  id: string;
  score: number;
  totalPoints: number;
  startedAt: string;
  completedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    gradeLevel: "10" | "11" | "12" | null;
  };
  quiz: {
    id: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
  };
  answers: QuizAttemptAnswer[];
};

export default function GradeAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<Record<string, number>>({}); // answerId -> pointsEarned
  const [inputValues, setInputValues] = useState<Record<string, string>>({}); // answerId -> input string value
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({}); // answerId -> feedback text

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/");
      return;
    }
    loadAttempt();
  }, [isAuthenticated, user, authLoading, router, attemptId]);

  const loadAttempt = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/quizzes/attempts/${attemptId}`), {
        headers: withAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Không thể tải bài làm");
      }

      const data: QuizAttempt = await res.json();
      setAttempt(data);

      // Initialize grades and feedbacks from existing answers
      const initialGrades: Record<string, number> = {};
      const initialInputValues: Record<string, string> = {};
      const initialFeedbacks: Record<string, string> = {};
      data.answers.forEach((answer) => {
        const points = answer.pointsEarned || 0;
        initialGrades[answer.id] = points;
        initialInputValues[answer.id] = points === 0 ? "" : points.toString();
        initialFeedbacks[answer.id] = answer.feedback || "";
      });
      setGrades(initialGrades);
      setInputValues(initialInputValues);
      setFeedbacks(initialFeedbacks);
    } catch (error) {
      alert("Không thể tải bài làm. Vui lòng thử lại.");
      router.push("/admin/submissions");
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (answerId: string, value: string) => {
    // Update input value
    setInputValues((prev) => ({
      ...prev,
      [answerId]: value,
    }));

    // Parse and update grade (without max validation here, will validate on blur)
    if (value === "" || value === null || value === undefined) {
      setGrades((prev) => ({
        ...prev,
        [answerId]: 0,
      }));
      return;
    }

    // Remove leading zeros except for "0" or "0."
    let cleanedValue = value;
    if (
      cleanedValue.length > 1 &&
      cleanedValue[0] === "0" &&
      cleanedValue[1] !== "."
    ) {
      cleanedValue = cleanedValue.replace(/^0+/, "");
      // Update input value with cleaned value
      setInputValues((prev) => ({
        ...prev,
        [answerId]: cleanedValue,
      }));
    }

    const numValue = parseFloat(cleanedValue);
    if (!isNaN(numValue) && isFinite(numValue)) {
      const validPoints = Math.max(0, numValue);
      setGrades((prev) => ({
        ...prev,
        [answerId]: validPoints,
      }));
    }
  };

  const handleBlur = (answerId: string, maxPoints: number) => {
    const inputValue = inputValues[answerId] || "";
    if (inputValue === "" || inputValue === null || inputValue === undefined) {
      setInputValues((prev) => ({
        ...prev,
        [answerId]: "0",
      }));
      setGrades((prev) => ({
        ...prev,
        [answerId]: 0,
      }));
    } else {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && isFinite(numValue)) {
        const validPoints = Math.max(0, Math.min(numValue, maxPoints));
        setInputValues((prev) => ({
          ...prev,
          [answerId]: validPoints.toString(),
        }));
        setGrades((prev) => ({
          ...prev,
          [answerId]: validPoints,
        }));
      }
    }
  };

  const saveGrades = async () => {
    if (!attempt) return;

    setSaving(true);
    try {
      // Update each answer's points (only for answers that exist)
      const updatePromises = Object.entries(grades)
        .filter(([answerId]) => answerId) // Only update if answerId exists
        .map(async ([answerId, pointsEarned]) => {
          const feedback = feedbacks[answerId] || "";
          const res = await fetch(
            apiUrl(`/quizzes/attempts/answers/${answerId}`),
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...withAuthHeaders(),
              },
              body: JSON.stringify({ pointsEarned, feedback }),
            },
          );

          if (!res.ok) {
            throw new Error(
              `Không thể cập nhật điểm cho câu trả lời ${answerId}`,
            );
          }

          return res.json();
        });

      await Promise.all(updatePromises);

      // Recalculate and update attempt score
      const totalScore = Object.values(grades).reduce(
        (sum, points) => sum + points,
        0,
      );

      // Update attempt score (backend will recalculate from all answers)
      const updateAttemptRes = await fetch(
        apiUrl(`/quizzes/attempts/${attemptId}/score`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...withAuthHeaders(),
          },
          body: JSON.stringify({ score: totalScore }),
        },
      );

      if (!updateAttemptRes.ok) {
        console.warn("Could not update attempt score, but grades were saved");
      }

      // Reload to get updated data with recalculated score from backend
      await loadAttempt();

      // Get updated attempt data after reload
      const updatedAttempt = await fetch(
        apiUrl(`/quizzes/attempts/${attemptId}`),
        {
          headers: withAuthHeaders(),
        },
      ).then((res) => (res.ok ? res.json() : null));

      // Console log thông tin điểm đã lưu
      const studentName = `${attempt.user.firstName} ${attempt.user.lastName}`;
      const exerciseName = attempt.quiz.title;
      const finalScore = updatedAttempt?.score || totalScore;
      const maxScore = attempt.quiz.questions.reduce(
        (sum, q) => sum + q.points,
        0,
      );

      console.log("=== ĐÃ LƯU ĐIỂM THÀNH CÔNG ===");
      console.log("Tên học sinh:", studentName);
      console.log("Tên bài tập:", exerciseName);
      console.log("Điểm số:", `${finalScore}/${maxScore}`);
      console.log("Chi tiết điểm từng câu:", grades);
      console.log("================================");

      // Hiển thị pop-up thông báo thành công và tự động quay lại
      alert("Đã lưu điểm thành công!");

      // Tự động quay lại trang trước (trang danh sách submissions) sau khi đóng alert
      setTimeout(() => {
        router.push("/admin/submissions");
      }, 100);
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Không thể lưu điểm. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !attempt) {
    return (
      <div className="bg-nc-cream min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">Đang tải...</div>
      </div>
    );
  }

  const studentName = `${attempt.user.firstName} ${attempt.user.lastName}`;
  const gradeLevel = attempt.user.gradeLevel || "N/A";
  const totalScore = Object.values(grades).reduce(
    (sum, points) => sum + points,
    0,
  );
  const maxScore = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);

  // Sort questions by orderIndex
  const sortedQuestions = attempt.quiz.questions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-nc-dark-orange mb-2">
                Chấm điểm bài làm
              </h1>
              <p className="text-gray-600">Bài tập: {attempt.quiz.title}</p>
            </div>
            <button
              onClick={() => router.push("/admin/submissions")}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Quay lại
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Học sinh:</p>
              <p className="font-semibold text-nc-dark-orange">{studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lớp:</p>
              <p className="font-semibold">Lớp {gradeLevel}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng điểm:</p>
                <p className="text-2xl font-bold text-nc-dark-orange">
                  {totalScore}
                </p>
              </div>
              <button
                onClick={saveGrades}
                disabled={saving}
                className="px-6 py-2 bg-nc-gold text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Đang lưu..." : "Lưu điểm"}
              </button>
            </div>
          </div>
        </div>

        {/* Questions and Answers */}
        <div className="space-y-4">
          {attempt.quiz.description && (
            <div className="card">
              <h2 className="text-lg font-semibold text-nc-dark-orange mb-2">
                Đề bài
              </h2>
              <div className="text-gray-700 whitespace-pre-wrap">
                {attempt.quiz.description}
              </div>
            </div>
          )}

          {sortedQuestions.map((question, idx) => {
            const answer = attempt.answers.find(
              (a) => a.questionId === question.id,
            );
            const isEssay =
              question.questionType === "essay" ||
              !question.options ||
              question.options.length === 0;
            const answerId = answer?.id;
            const currentPoints = answerId ? grades[answerId] || 0 : 0;
            const currentInputValue = answerId
              ? (inputValues[answerId] ??
                (currentPoints === 0 ? "" : currentPoints.toString()))
              : "";
            const maxPoints = question.points;

            return (
              <div key={question.id} className="card">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">
                        Câu {idx + 1}
                      </div>
                      <div className="font-medium mb-3">
                        {question.questionText}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      ({maxPoints} điểm)
                    </div>
                  </div>

                  {/* Student's Answer */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Câu trả lời của học sinh:
                    </p>
                    {answer?.answerText ? (
                      // If there's answerText, show it (for essay questions or text input)
                      <div className="text-gray-800 whitespace-pre-wrap">
                        {answer.answerText}
                      </div>
                    ) : answer?.selectedOption ? (
                      // If there's selectedOption, show it (for multiple choice)
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-nc-dark-orange">
                          {answer.selectedOption.optionText}
                        </span>
                        {answer.isCorrect !== undefined && (
                          <span
                            className={`text-sm px-2 py-1 rounded ${
                              answer.isCorrect
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {answer.isCorrect ? "Đúng" : "Sai"}
                          </span>
                        )}
                      </div>
                    ) : answer?.selectedOptionId ? (
                      // If selectedOptionId exists but selectedOption is null (invalid UUID or missing option)
                      // Check if it's a valid UUID format, if not, treat it as text answer
                      (() => {
                        const uuidRegex =
                          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const isValidUUID = uuidRegex.test(
                          answer.selectedOptionId,
                        );
                        if (!isValidUUID) {
                          // selectedOptionId is not a valid UUID, treat it as text answer
                          return (
                            <div className="text-gray-800 whitespace-pre-wrap">
                              {answer.selectedOptionId}
                            </div>
                          );
                        }
                        // Valid UUID but option not found, show as missing
                        return (
                          <span className="text-gray-500">
                            (Đã chọn nhưng không tìm thấy lựa chọn)
                          </span>
                        );
                      })()
                    ) : (
                      // No answer provided
                      <span className="text-gray-500">(Chưa trả lời)</span>
                    )}
                  </div>

                  {/* Grade Input */}
                  {answerId && (
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">
                        Điểm:
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currentInputValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty, numbers, and decimal point
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            updateGrade(answerId, value);
                          }
                        }}
                        onBlur={() => handleBlur(answerId, maxPoints)}
                        placeholder="0"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nc-gold"
                      />
                      <span className="text-sm text-gray-600">
                        / {maxPoints} điểm
                      </span>
                    </div>
                  )}

                  {/* Feedback Input */}
                  {answerId && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gợi ý / Góp ý:
                      </label>
                      <textarea
                        value={feedbacks[answerId] || ""}
                        onChange={(e) => {
                          setFeedbacks((prev) => ({
                            ...prev,
                            [answerId]: e.target.value,
                          }));
                        }}
                        placeholder="Nhập gợi ý hoặc góp ý cho câu trả lời của học sinh..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nc-gold resize-y"
                      />
                    </div>
                  )}

                  {!answerId && (
                    <div className="text-sm text-gray-500 italic">
                      Học sinh chưa trả lời câu hỏi này
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
