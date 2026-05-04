import React, { useState } from 'react';

export default function Quiz({ questions }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const handleSelect = (qi, oi) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qi]: oi }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    setScore(Math.round((correct / questions.length) * 100));
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  const passed = score >= 70;

  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '32px',
      background: 'var(--ifm-background-surface-color)',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{
          fontSize: '11px',
          letterSpacing: '2px',
          fontWeight: '700',
          color: 'var(--ifm-color-primary)',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
        }}>
          ✦ Test Your Knowledge
        </span>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: '24px' }}>
          <p style={{ fontWeight: '600', marginBottom: '10px' }}>
            <span style={{ color: 'var(--ifm-color-primary)', fontFamily: 'monospace', marginRight: '8px' }}>
              {qi + 1}.
            </span>
            {q.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, oi) => {
              let borderColor = 'var(--ifm-color-emphasis-300)';
              let background = 'transparent';
              let color = 'var(--ifm-font-color-base)';
              let icon = String.fromCharCode(65 + oi);

              if (answers[qi] === oi && !submitted) {
                borderColor = 'var(--ifm-color-primary)';
                background = 'var(--ifm-color-primary-lightest)';
                color = 'var(--ifm-color-primary-darkest)';
              }

              if (submitted) {
                if (oi === q.answer) {
                  borderColor = '#22c55e';
                  background = '#f0fdf4';
                  color = '#15803d';
                  icon = '✓';
                } else if (answers[qi] === oi) {
                  borderColor = '#ef4444';
                  background = '#fef2f2';
                  color = '#b91c1c';
                  icon = '✗';
                }
              }

              return (
                <div
                  key={oi}
                  onClick={() => handleSelect(qi, oi)}
                  style={{
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: submitted ? 'default' : 'pointer',
                    background,
                    color,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    fontWeight: '700',
                  }}>
                    {icon}
                  </span>
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="button button--primary"
          style={{ marginTop: '8px', opacity: Object.keys(answers).length < questions.length ? 0.5 : 1 }}
        >
          Submit Answers
        </button>
      ) : (
        <div style={{
          marginTop: '16px',
          padding: '20px',
          borderRadius: '10px',
          border: `1px solid ${passed ? '#22c55e' : '#ef4444'}`,
          background: passed ? '#f0fdf4' : '#fef2f2',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: passed ? '#15803d' : '#b91c1c', fontFamily: 'monospace' }}>
                {score}%
              </div>
              <div style={{ fontSize: '13px', color: passed ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
                {passed ? '✓ Passed — Great understanding!' : '✗ Failed — Review the section and try again'}
              </div>
              <div style={{
                marginTop: '10px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
                height: '6px',
                width: '200px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${score}%`,
                  background: passed ? '#22c55e' : '#ef4444',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
            <button
              onClick={handleRetry}
              className={`button button--sm ${passed ? 'button--success' : 'button--danger'}`}
              style={{ flexShrink: 0 }}
            >
              ↺ Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
