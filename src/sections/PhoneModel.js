import React from "react";
import styled from "styled-components";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, Environment } from "@react-three/drei";
import Model from "../components/Scene";
import { Suspense } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  z-index: 1;
  background-color: transparent;
  transition: all 0.3s ease;
`;

const PhoneModel = () => {
  return (
    <Container id="phone-model">
      <Canvas
        camera={{ fov: 14 }}
        gl={{ outputColorSpace: SRGBColorSpace, toneMapping: ACESFilmicToneMapping }}
      >
        {/* Three r155 removed the legacy PI multiplier from light intensities. */}
        <ambientLight intensity={1.25 * Math.PI} />
        <directionalLight intensity={0.4 * Math.PI} />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <Environment preset="night" />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        {/* <OrbitControls /> */}
      </Canvas>
    </Container>
  );
};

export default PhoneModel;
