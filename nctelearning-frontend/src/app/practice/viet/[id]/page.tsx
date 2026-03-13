"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiUrl } from '@/lib/api';

// Force dynamic rendering - this page uses dynamic route params
export const dynamic = 'force-dynamic';

// Utility for formatting mm:ss
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VietExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchExercise() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/essay-exercises/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy bài tập");
        const data = await res.json();
        setExercise(data);
        if (data.timeLimitMinutes) {
          setTimeLeft(data.timeLimitMinutes * 60);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchExercise();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Timer countdown and auto-submit
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, submitted]);

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/essay-exercises/submissions'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== 'undefined' && localStorage.getItem("accessToken") ? { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          exerciseId: id,
          content: answer,
          timeSpentMinutes: exercise?.timeLimitMinutes ? exercise.timeLimitMinutes - Math.floor((timeLeft ?? 0) / 60) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Nộp bài thất bại. Vui lòng thử lại.");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nc-cream text-xl">Đang tải bài tập...</div>
    );
  }
  if (error && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nc-cream text-red-600 text-xl">{error}</div>
    );
  }
  if (!exercise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-nc-cream flex flex-col items-center py-10 px-2 relative">
      {/* Top control bar */}
      <div className="w-full flex justify-between items-start max-w-2xl mb-6">
        <div className="text-left">
          {typeof timeLeft === 'number' && !submitted && (
            <span className="font-mono text-2xl font-bold text-nc-dark-orange bg-white px-4 py-2 rounded-xl shadow">
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div>
          <button
            className="btn-primary px-6 py-2 text-lg font-semibold rounded-xl"
            onClick={handleSubmit}
            disabled={submitting || submitted}
          >
            {submitting ? "Đang nộp..." : submitted ? "Đã nộp" : "Nộp bài"}
          </button>
        </div>
      </div>
      {/* Prompt at top */}
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-6 mb-8">
        <div className="text-2xl font-bold text-nc-dark-orange mb-4">{exercise.prompt}</div>
        {exercise.description && (
          <div className="text-gray-600 mb-2">{exercise.description}</div>
        )}
        {exercise.timeLimitMinutes && (
          <div className="text-sm text-gray-500">Thời gian làm bài: {exercise.timeLimitMinutes} phút</div>
        )}
      </div>
      {/* After successful submission: show confirmation instead of form */}
      <div className="w-full max-w-2xl">
        {submitted ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl shadow p-8 text-center text-lg text-green-700 font-semibold">
            Bài làm đã được gửi tới giáo viên!
          </div>
        ) : (
          <>
            <textarea
              value={answer}
              disabled={submitted}
              onChange={e => setAnswer(e.target.value)}
              className="w-full min-h-[220px] p-4 border border-nc-gold rounded-lg font-medium text-lg shadow bg-white focus:border-nc-dark-orange focus:ring-2 focus:ring-nc-gold/30 mb-6"
              placeholder="Nhập bài làm của bạn ở đây..."
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
