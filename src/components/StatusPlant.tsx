import { useEffect, useRef, useState } from 'react';
import type { PlantHandle } from '../garden/Plant';
import Plant from '../garden/Plant';
import type { FlowerKind, GrowthStage } from '../worlds/types';
import ParticleBurst from './ParticleBurst';
import styles from './StatusPanel.module.css';

// The skill's plant, small. When the score crosses into a new stage it grows there while the child watches,
// with a puff of leaves.
export default function StatusPlant({ kind, stage }: { kind: FlowerKind; stage: GrowthStage }) {
  const plant = useRef<PlantHandle>(null);
  // The plant is drawn at the stage it had when the panel opened, and then told to grow, so the change is seen.
  const [first] = useState(stage);
  const [grown, setGrown] = useState(0); // how many times it has grown here: each one throws its own leaves
  const [last, setLast] = useState(stage);
  if (last !== stage) {
    setLast(stage);
    if (stage > last) setGrown((n) => n + 1);
  }
  useEffect(() => {
    plant.current?.growTo(stage);
  }, [stage]);
  return (
    <div className={styles.block} data-status-plant="" data-stage={stage}>
      <span className={styles.label}>Your plant</span>
      <div className={styles.plant}>
        <Plant ref={plant} stage={first} kind={kind} />
        {grown > 0 && <ParticleBurst key={grown} kind="leaf" seed={grown} at={{ x: 0.5, y: 0.4 }} />}
      </div>
    </div>
  );
}
