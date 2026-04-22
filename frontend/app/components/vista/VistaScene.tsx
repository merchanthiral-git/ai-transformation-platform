'use client';

import Sky from './layers/Sky';
import Celestial from './layers/Celestial';
import Stars from './layers/Stars';
import Clouds from './layers/Clouds';
import Mountains from './layers/Mountains';
import Village from './layers/Village';
import Water from './layers/Water';
import Weather from './layers/Weather';
import Embers from './layers/Embers';
import Birds from './layers/Birds';
import Characters from './layers/Characters';

export default function VistaScene() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <Sky />
      <Stars />
      <Celestial />
      <Clouds />
      <Mountains />
      <Village />
      <Water />
      <Characters />
      <Birds />
      <Embers />
      <Weather />
    </div>
  );
}
