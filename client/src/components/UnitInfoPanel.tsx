import type { UnitData } from '@shared/types/index.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';

interface Props {
  unit: UnitData;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  poison: { label: '독', color: '#44ff44' },
  stun: { label: '기절', color: '#888888' },
  confuse: { label: '혼란', color: '#ffff44' },
  attack_up: { label: '공+', color: '#ff8844' },
  defense_up: { label: '방+', color: '#4488ff' },
  attack_down: { label: '공-', color: '#884422' },
  defense_down: { label: '방-', color: '#224488' },
};

export function UnitInfoPanel({ unit }: Props) {
  const hpRatio = unit.stats.hp / unit.stats.maxHp;
  const hpColor = hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffff00' : '#ff0000';
  const className = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name : '';
  const hasMp = unit.maxMp !== undefined && unit.maxMp > 0;
  const mpRatio = hasMp ? (unit.mp ?? 0) / unit.maxMp! : 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: 70,
      left: 10,
      background: 'rgba(26, 26, 46, 0.95)',
      border: '1px solid #4a4a6a',
      borderRadius: 8,
      padding: '12px 16px',
      color: '#fff',
      minWidth: 180,
      fontSize: 14,
      pointerEvents: 'none' as const,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
        {unit.name}
        <span style={{ marginLeft: 8, fontSize: 12, color: unit.faction === 'player' ? '#4169e1' : '#dc143c' }}>
          {unit.faction === 'player' ? '아군' : '적군'}
        </span>
      </div>

      {className && (
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
          {className} {unit.level ? `Lv.${unit.level}` : ''}
        </div>
      )}

      <div style={{ marginBottom: 4 }}>
        <span>HP: {unit.stats.hp} / {unit.stats.maxHp}</span>
        <div style={{ height: 6, background: '#333', borderRadius: 3, marginTop: 2 }}>
          <div style={{ height: '100%', width: `${hpRatio * 100}%`, background: hpColor, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>

      {hasMp && (
        <div style={{ marginBottom: 4 }}>
          <span>MP: {unit.mp} / {unit.maxMp}</span>
          <div style={{ height: 6, background: '#333', borderRadius: 3, marginTop: 2 }}>
            <div style={{ height: '100%', width: `${mpRatio * 100}%`, background: '#4488ff', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {unit.level !== undefined && (
        <div style={{ marginBottom: 4, fontSize: 12, color: '#aaa' }}>
          <span>EXP: {unit.exp ?? 0} / 100</span>
          <div style={{ height: 4, background: '#333', borderRadius: 2, marginTop: 2 }}>
            <div style={{ height: '100%', width: `${(unit.exp ?? 0)}%`, background: '#aa88ff', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontSize: 13, color: '#ccc' }}>
        <span>공격: {unit.stats.attack}</span>
        <span>방어: {unit.stats.defense}</span>
        <span>이동: {unit.stats.moveRange}</span>
        <span>사거리: {unit.stats.attackRange}</span>
      </div>

      {unit.equipment && (Object.values(unit.equipment).some(Boolean)) && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#8888aa' }}>
          {unit.equipment.weapon && <div>무기: {EQUIPMENT_DEFS[unit.equipment.weapon]?.name}</div>}
          {unit.equipment.armor && <div>방어구: {EQUIPMENT_DEFS[unit.equipment.armor]?.name}</div>}
          {unit.equipment.accessory && <div>장신구: {EQUIPMENT_DEFS[unit.equipment.accessory]?.name}</div>}
        </div>
      )}

      {unit.statusEffects && unit.statusEffects.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {unit.statusEffects.map((se, i) => {
            const info = STATUS_LABELS[se.effect] ?? { label: se.effect, color: '#fff' };
            return (
              <span key={i} style={{
                fontSize: 11, padding: '1px 5px', borderRadius: 3,
                background: 'rgba(255,255,255,0.1)', color: info.color,
              }}>
                {info.label}({se.remainingTurns})
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
