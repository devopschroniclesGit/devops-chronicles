export default function GrafanaPanel({ src, height = 500, title = "Grafana Dashboard" }) {
  return (
    <div style={{ width: '100%', margin: '24px 0' }}>
      <div style={{
        fontSize: '11px',
        letterSpacing: '2px',
        color: 'var(--ifm-color-primary)',
        fontFamily: 'monospace',
        fontWeight: '700',
        marginBottom: '8px',
        textTransform: 'uppercase'
      }}>
        ◉ Live Production Dashboard
      </div>
      <iframe
        src={src}
        width="100%"
        height={height}
        frameBorder="0"
        title={title}
        style={{
          borderRadius: '8px',
          border: '1px solid var(--ifm-color-emphasis-300)',
          display: 'block',
        }}
        allowFullScreen
      />
      <div style={{
        fontSize: '11px',
        color: 'var(--ifm-color-emphasis-600)',
        fontFamily: 'monospace',
        marginTop: '6px'
      }}>
        Live data — updates every 5 seconds · Powered by Grafana Cloud
      </div>
    </div>
  );
}
