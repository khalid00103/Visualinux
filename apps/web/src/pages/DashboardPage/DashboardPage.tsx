import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav.js";
import { useAuthStore } from "../../store/authStore.js";
import {
  getLearningProgress,
  type LearningProgress,
} from "../../api/learning.js";

const learningCards = [
  {
    icon: "📘",
    eyebrow: "GUIDED LEARNING",
    title: "Start learning Linux",
    description:
      "Follow a lesson, understand the command, and see how it changes the simulated filesystem.",
    action: "Start with pwd",
    href: "/learn/pwd",
  },
  {
    icon: "⌨️",
    eyebrow: "HANDS-ON PRACTICE",
    title: "Practice in the terminal",
    description:
      "Experiment with Linux commands in the interactive terminal and observe filesystem changes.",
    action: "Open Practice",
    href: "/practice",
  },
  {
    icon: "📂",
    eyebrow: "FILESYSTEM BASICS",
    title: "Explore directories",
    description:
      "Learn how to navigate directories and inspect files using pwd, ls, and cd.",
    action: "Explore ls",
    href: "/learn/ls",
  },
];

const lessons = [
  { command: "pwd", title: "Current directory", href: "/learn/pwd", category: "Navigation" },
  { command: "ls", title: "List files and folders", href: "/learn/ls", category: "Navigation" },
  { command: "cd", title: "Change directory", href: "/learn/cd", category: "Navigation" },
  { command: "mkdir", title: "Create directories", href: "/learn/mkdir", category: "Filesystem" },
  { command: "touch", title: "Create files", href: "/learn/touch", category: "Filesystem" },
  { command: "rm", title: "Remove files", href: "/learn/rm", category: "Filesystem" },
  { command: "cp", title: "Copy files", href: "/learn/cp", category: "Filesystem" },
  { command: "mv", title: "Move and rename", href: "/learn/mv", category: "Filesystem" },
  { command: "cat", title: "Read file contents", href: "/learn/cat", category: "Text" },
  { command: "echo", title: "Print text", href: "/learn/echo", category: "Text" },
  { command: "head", title: "Read the first lines", href: "/learn/head", category: "Text" },
  { command: "tail", title: "Read the last lines", href: "/learn/tail", category: "Text" },
  { command: "grep", title: "Search text", href: "/learn/grep", category: "Text" },
  { command: "wc", title: "Count lines and words", href: "/learn/wc", category: "Text" },
  { command: "sort", title: "Sort text", href: "/learn/sort", category: "Text" },
  { command: "chmod", title: "Change permissions", href: "/learn/chmod", category: "Permissions" },
  { command: "chown", title: "Change ownership", href: "/learn/chown", category: "Permissions" },
  { command: "whoami", title: "Identify the current user", href: "/learn/whoami", category: "System" },
  { command: "clear", title: "Clear the terminal", href: "/learn/clear", category: "Terminal" },
  { command: "man", title: "Read command manuals", href: "/learn/man", category: "Help" },
];

const styles = {
  page: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px 56px",
  },
  muted: {
    color: "var(--text-secondary, #6b7280)",
    lineHeight: 1.7,
  },
  card: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "14px",
    padding: "22px",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: "14px",
    background: "var(--card-background, #ffffff)",
    color: "inherit",
    textDecoration: "none",
    minWidth: 0,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 18px",
    borderRadius: "9px",
    background: "var(--primary, #374151)",
    color: "var(--primary-foreground, #ffffff)",
    fontWeight: 600,
    textDecoration: "none",
    width: "fit-content",
  },
};


export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const displayName = user?.displayName?.trim();

  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!accessToken) {
      setProgress(null);
      setProgressError(false);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);
    setProgressError(false);

    getLearningProgress(accessToken)
      .then((data) => {
        if (!cancelled) {
          setProgress(data);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load learning progress:", error);

        if (!cancelled) {
          setProgressError(true);
          setProgress(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const completedLessonIds = new Set(
    progress?.completedLessonIds ?? [],
  );

  const progressPercentage =
    progress && progress.totalLessons > 0
      ? Math.round(
          (progress.completedCount / progress.totalLessons) * 100,
        )
      : 0;

  
  const nextLesson = lessons.find(
    (lesson) => !completedLessonIds.has(lesson.command),
  );

  const allLessonsComplete = Boolean(
    progress &&
      progress.totalLessons > 0 &&
      progress.completedCount >= progress.totalLessons,
  );

  const continueHref = allLessonsComplete
    ? "/practice"
    : nextLesson?.href ?? "/learn/pwd";

  const continueLabel = allLessonsComplete
    ? "Practice Linux"
    : "Continue learning";


  return (
    <div>
      <TopNav />

      <main style={styles.page}>
        
        {/* Welcome and learning progress */}
        <section
          style={{
            padding: "clamp(24px, 5vw, 44px)",
            borderRadius: "18px",
            background:
              "var(--primary-subtle, var(--surface-secondary, #f3f4f6))",
            marginBottom: "36px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              margin: "0 0 12px",
              color: "#5e5f62",
            }}
          >
            VISUALINUX · INTERACTIVE LINUX LEARNING
          </p>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              lineHeight: 1.2,
              margin: "0 0 14px",
              color: "black",
            }}
          >
            {displayName
              ? `Welcome back, ${displayName}.`
              : "Welcome to Visualinux."}
          </h1>

          <p
            style={{
              maxWidth: "650px",
              margin: "0 0 24px",
              fontSize: "16px",
              color: "#5e5f62",
            }}
          >
            {progress && progress.completedCount > 0
              ? allLessonsComplete
                ? "Fantastic work! You've completed all the guided Linux lessons. Keep your skills sharp with hands-on practice."
                : "Keep building your Linux skills. Your completed lessons are saved, so you can continue from where you are in your learning journey."
              : "Learn Linux by doing. Understand commands, explore the filesystem, and practise in a visual terminal instead of just memorising syntax."}
          </p>

          {progressLoading ? (
            <p role="status" style={{ color: "#5e5f62", margin: 0 }}>
              Loading your learning progress...
            </p>
          ) : progressError ? (
            <div>
              <p
                role="alert"
                style={{ color: "#7f1d1d", margin: "0 0 16px" }}
              >
                We couldn't load your saved progress. You can still access your lessons.
              </p>

              <Link to="/learn/pwd" style={styles.button}>
                Browse lessons <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : 
            progress && progress.completedCount > 0 ? (
              <div
                style={{
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(55, 65, 81, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 390px), 1fr))",
                    gap: "24px",
                    alignItems: "stretch",
                  }}
                >
                  {/* Left: progress summary */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "14px",
                      minWidth: 0,
                      padding: "8px 0",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "20px",
                        margin: 0,
                        color: "black",
                      }}
                    >
                      Your learning progress
                    </h2>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "36px", fontWeight: 750, color:"black"}}>
                        {progress.completedCount}
                      </span>

                      <span style={{ color: "#5e5f62", fontSize: "14px" }}>
                        of {progress.totalLessons} lessons completed
                      </span>

                      <span
                        style={{
                          marginLeft: "auto",
                          fontWeight: 750,
                          fontSize: "20px",
                          color: "#374151",
                        }}
                      >
                        {progressPercentage}%
                      </span>
                    </div>

                    <div
                      role="progressbar"
                      aria-label="Overall learning progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressPercentage}
                      style={{
                        height: "10px",
                        borderRadius: "999px",
                        overflow: "hidden",
                        background: "rgba(55, 65, 81, 0.16)",
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPercentage}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background: "var(--primary, #374151)",
                          transition: "width 250ms ease",
                        }}
                      />
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: "#5e5f62",
                      }}
                    >
                      {allLessonsComplete
                        ? "You've completed every guided lesson. Great work!"
                        : "Your completed lessons are saved to your account."}
                    </p>
                  </div>

                  {/* Right: recommended next step */}
                  <aside
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      gap: "12px",
                      minWidth: 0,
                      padding: "22px",
                      border: "1px solid rgba(55, 65, 81, 0.14)",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.75)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 750,
                        letterSpacing: "1px",
                        color: "#5e5f62",
                      }}
                    >
                      {allLessonsComplete
                        ? "LEARNING PATH COMPLETE"
                        : "RECOMMENDED NEXT LESSON"}
                    </span>

                    {allLessonsComplete ? (
                      <>
                        <h3 style={{ fontSize: "22px", margin: 0, color: "black" }}>
                          Ready to practise?
                        </h3>

                        <p
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.6,
                            margin: 0,
                            color: "#5e5f62",
                          }}
                        >
                          You've completed all the guided lessons. Test your skills in the
                          interactive terminal.
                        </p>
                      </>
                    ) : nextLesson ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <code
                            style={{
                              padding: "6px 10px",
                              borderRadius: "7px",
                              background: "#E5E7EB",
                              color: "#111827",
                              fontSize: "16px",
                              fontWeight: 750,
                            }}
                          >
                            {nextLesson.command}
                          </code>

                          <span style={{ fontSize: "12px", color: "#5e5f62" }}>
                            {nextLesson.category}
                          </span>
                        </div>

                        <h3 style={{ fontSize: "22px", margin: 0, color: "black" }}>
                          {nextLesson.title}
                        </h3>

                        <p
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.6,
                            margin: 0,
                            color: "#5e5f62",
                          }}
                        >
                          Continue your learning path with this lesson.
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, color: "#5e5f62" }}>
                        Explore Practice mode to continue building your Linux skills.
                      </p>
                    )}

                    <Link
                      to={continueHref}
                      style={{
                        ...styles.button,
                        marginTop: "4px",
                      }}
                    >
                      {continueLabel} <span aria-hidden="true">→</span>
                    </Link>
                  </aside>
                </div>
              </div>
            ) : (

            <Link to="/learn/pwd" style={styles.button}>
              Start your first lesson
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>



        {/* Main destinations */}
        <section style={{ marginBottom: "44px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "23px", margin: "0 0 8px" }}>
              Choose your learning mode
            </h2>
            <p style={{ ...styles.muted, margin: 0 }}>
              Follow a lesson, practise freely, or explore the filesystem.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {learningCards.map((card) => (
              <Link
                key={card.title}
                to={card.href}
                style={styles.card}
              >
                <span aria-hidden="true" style={{ fontSize: "30px" }}>
                  {card.icon}
                </span>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "#5e5f62",
                  }}
                >
                  {card.eyebrow}
                </span>

                <h3 style={{ fontSize: "19px", margin: 0, color:"black"}}>
                  {card.title}
                </h3>

                <p style={{ fontSize: "14px", margin: 0, flex: 1 , color:"#5e5f62"}}>
                  {card.description}
                </p>

                <span style={{ fontWeight: 600, fontSize: "14px", color:"#545252" }}>
                  {card.action} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Lesson library */}
        <section id="lesson-library">
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "23px", margin: "0 0 8px" }}>
              Linux lesson library
            </h2>
            <p style={{ ...styles.muted, margin: 0 }}>
              Choose a command to open its existing guided lesson.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            {lessons.map((lesson) => (
              <Link
                key={lesson.command}
                to={lesson.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "16px",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "inherit",
                  minWidth: 0,
                }}
              >
                <code
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    //color: "var(--primary, #374151)",
                  }}
                >
                  {lesson.command}
                </code>

                <span style={{ fontWeight: 600, fontSize: "14px"}}>
                  {lesson.title}
                </span>

                
                <span style={{ ...styles.muted, fontSize: "12px" }}>
                  {lesson.category}
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: completedLessonIds.has(lesson.command)
                      ? "#15803d"
                      : "var(--text-secondary, #6b7280)",
                  }}
                >
                  {completedLessonIds.has(lesson.command)
                    ? "✓ Completed"
                    : "Not completed"}
                </span>

              </Link>
            ))}
          </div>
        </section>

        {/* Practice CTA */}
        <section
          style={{
            marginTop: "40px",
            padding: "24px",
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: "14px",
          }}
        >
          <h2 style={{ fontSize: "20px", margin: "0 0 8px" }}>
            Ready to experiment?
          </h2>

          <p style={{ ...styles.muted, margin: "0 0 18px" }}>
            Try commands on your own in Practice mode. It uses the existing
            terminal and filesystem simulation rather than a separate simulator.
          </p>

          <Link to="/practice" style={styles.button}>
            Open Practice mode <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}

