import type { CLAUDEMdSections } from '@/lib/types'

type Props = {
  sections: CLAUDEMdSections
}

export function StrategyFoundation({ sections }: Props) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#1a1a1a' }}>
        Socle fondamental
      </h2>

      {/* Identité */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Identité & Mission
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
          {sections.identite}
        </p>
      </div>

      {/* Convictions */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Convictions
        </h3>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          {sections.convictions.map((c, i) => (
            <li key={i} style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', marginBottom: '6px' }}>
              {c}
            </li>
          ))}
        </ol>
      </div>

      {/* Piliers */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Piliers thématiques
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dee2e6' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>Pilier</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>Angle</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {sections.piliers.map((p) => (
              <tr key={p.num} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '6px 8px', color: '#999' }}>{p.num}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500, color: '#333' }}>{p.nom}</td>
                <td style={{ padding: '6px 8px', color: '#555' }}>{p.angle}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#333', fontWeight: 500 }}>{p.frequence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audience */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Audience cible
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {sections.audience.map((a) => (
            <div key={a.type} style={{ padding: '14px', background: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#495057', textTransform: 'capitalize', marginBottom: '8px' }}>
                Cible {a.type}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Douleur :</span> {a.douleur}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <span style={{ fontWeight: 600 }}>Cherche :</span> {a.cherche}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voix */}
      <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Voix & Style
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
          {sections.voix}
        </p>
      </div>
    </div>
  )
}
