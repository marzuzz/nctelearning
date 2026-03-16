"use client";

import { useState, useEffect, Suspense } from "react";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

// Force dynamic rendering - this page uses searchParams which requires dynamic rendering
export const dynamic = "force-dynamic";

const JoditEditor = nextDynamic(() => import("jodit-react"), { ssr: false });

type QuestionInput = {
  questionText: string;
  points: number | "";
};

type Lesson = {
  id: string;
  title: string;
  course: { id: string; title: string; gradeLevel: "10" | "11" | "12" };
};

function NewExercisePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chosenType = searchParams?.get("type") as "doc_hieu" | "viet" | null;

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">("");
  const [gradeLevel, setGradeLevel] = useState<"10" | "11" | "12" | "">("");
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [practiceType, setPracticeType] = useState<"doc_hieu" | "viet" | "">(
    "",
  );
  const [topic, setTopic] = useState<string>("");
  const [description, setDescription] = useState("");

  // Set practiceType based on chosenType from URL
  useEffect(() => {
    if (chosenType) {
      setPracticeType(chosenType);
    }
  }, [chosenType]);

  useEffect(() => {
    if (chosenType === "doc_hieu") {
      setQuestions([
        { questionText: "", points: 0.5 },
        { questionText: "", points: 0.5 },
        { questionText: "", points: 1 },
        { questionText: "", points: 1 },
        { questionText: "", points: 1 },
      ]);
    }
  }, [chosenType]);

  const docHieuTopics = [
    { value: "tho", label: "Thơ" },
    { value: "truyen", label: "Truyện" },
    { value: "ki", label: "Kí" },
    { value: "nghi_luan", label: "Văn bản nghị luận" },
    { value: "thong_tin", label: "Văn bản thông tin" },
  ];
  const vietTopics = [
    { value: "nghi_luan_xa_hoi", label: "Nghị luận xã hội" },
    { value: "nghi_luan_van_hoc", label: "Nghị luận văn học" },
  ];

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Lessons no longer required for creation, but we may keep fetching if needed in future.


  const updateQuestion = (
    index: number,
    updater: (q: QuestionInput) => QuestionInput,
  ) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updater(q) : q)));
  };

  const submitAll = async () => {
    if (!title) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }
    if (!gradeLevel) {
      setError("Vui lòng chọn lớp");
      return;
    }
    if (!practiceType) {
      setError("Vui lòng chọn loại luyện tập");
      return;
    }
    if (!topic) {
      setError("Vui lòng chọn chủ đề");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const quizRes = await fetch(apiUrl("/quizzes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title,
          // Save rich-text content into quizzes.description
          description: prompt,
          timeLimitMinutes:
            typeof timeLimitMinutes === "number" ? timeLimitMinutes : undefined,
          isPublished: true,
          gradeLevel,
          practiceType,
          topic,
        }),
      });

      if (!quizRes.ok) {
        const msg = await quizRes.text();
        throw new Error(msg || "Failed to create exercise");
      }
      const quiz = await quizRes.json();
      console.log("quiz response:", quiz);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionRes = await fetch(apiUrl("/quizzes/questions"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: "essay",
            orderIndex: i + 1,
            points: q.points,
          }),
        });
        if (!questionRes.ok) {
          const msg = await questionRes.text();
          throw new Error(msg || "Failed to create question");
        }
      }

      router.push("/practice");
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tạo bài tập. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!chosenType) {
    return (
      <div className="bg-nc-cream min-h-screen py-12 flex items-center justify-center text-xl text-nc-dark-orange">
        Vui lòng chọn loại bài tập từ trang quản lý.
      </div>
    );
  }

  if (chosenType === "viet") {
    return (
      <div className="bg-nc-cream min-h-screen py-8">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-nc-dark-orange mb-7">
            Tạo Bài Tập Viết (Nghị luận)
          </h1>
          <div className="card space-y-6">
            <div>
              <label className="label">Lớp</label>
              <select
                className="input"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value as any)}
              >
                <option value="">Chọn lớp</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>
            <div>
              <label className="label">Chọn chủ đề viết</label>
              <select
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Chọn chủ đề viết</option>
                {vietTopics.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Mô tả bài tập (mục đích, hướng dẫn, v.v.)
              </label>
              <textarea
                className="input min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả cho bài tập (không bắt buộc)"
              />
            </div>
            <div>
              <label className="label">Đề bài</label>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <JoditEditor
                  value={prompt}
                  onChange={(content: string) => setPrompt(content)}
                />
              </div>
            </div>
            <div>
              <label className="label">
                Giới hạn thời gian (phút, tuỳ chọn)
              </label>
              <input
                className="input"
                type="number"
                min={0}
                value={timeLimitMinutes}
                onChange={(e) =>
                  setTimeLimitMinutes(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="Ví dụ: 60"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex justify-end">
              <button
                disabled={submitting}
                className="btn-primary"
                onClick={async () => {
                  if (!gradeLevel) {
                    setError("Vui lòng chọn lớp");
                    return;
                  }
                  if (!topic) {
                    setError("Vui lòng chọn chủ đề");
                    return;
                  }
                  if (!prompt) {
                    setError("Vui lòng nhập đề bài");
                    return;
                  }
                  setSubmitting(true);
                  setError(null);
                  try {
                    const res = await fetch(apiUrl("/essay-exercises"), {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeaders(),
                      },
                      body: JSON.stringify({
                        title:
                          prompt.slice(0, 32) +
                          (prompt.length > 32 ? "..." : ""),
                        description,
                        prompt,
                        timeLimitMinutes:
                          typeof timeLimitMinutes === "number"
                            ? timeLimitMinutes
                            : undefined,
                        isPublished: true,
                        gradeLevel,
                        practiceType: "viet",
                        topic,
                      }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    router.push("/admin/practice");
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Không thể tạo bài tập.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? "Đang tạo..." : "Tạo bài tập Viết"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-nc-dark-orange mb-6">
          TẠO BÀI TẬP ĐỌC HIỂU
        </h1>

        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tiêu đề</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên bài tập"
              />
            </div>
            <div>
              <label className="label">Thời gian (phút)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={timeLimitMinutes}
                onChange={(e) =>
                  setTimeLimitMinutes(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="ví dụ: 30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Lớp</label>
              <select
                className="input"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value as any)}
              >
                <option value="">Chọn lớp</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>
            <div>
              <label className="label">Chọn chủ đề đọc hiểu</label>
              <select
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Chọn chủ đề đọc hiểu</option>
                {docHieuTopics.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Đề bài</label>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <JoditEditor
                value={prompt}
                onChange={(content: string) => setPrompt(content)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-nc-dark-orange">
              Câu hỏi
            </h2>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start gap-4 mb-3">
                  <span className="text-sm text-gray-500 mt-2">
                    Câu {idx + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      className="input mb-3"
                      value={q.questionText}
                      onChange={(e) =>
                        updateQuestion(idx, (prev) => ({
                          ...prev,
                          questionText: e.target.value,
                        }))
                      }
                      placeholder="Nhập nội dung câu hỏi"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600">
                        Điểm tối đa
                      </label>

                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="input w-24"
                        value={q.points}
                        readOnly
                      />
                    </div>

                    <div className="text-sm text-gray-600">
                      Học sinh sẽ trả lời bằng văn bản tự luận
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end">
            <button
              disabled={submitting}
              className="btn-primary"
              onClick={submitAll}
            >
              {submitting ? "Đang tạo..." : "Tạo bài tập"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewExercisePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-nc-cream min-h-screen py-12 flex items-center justify-center text-xl text-nc-dark-orange">
          Đang tải...
        </div>
      }
    >
      <NewExercisePageContent />
    </Suspense>
  );
}
