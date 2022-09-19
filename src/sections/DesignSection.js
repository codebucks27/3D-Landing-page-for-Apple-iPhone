import gsap from "gsap";
import React from "react";
import { useLayoutEffect } from "react";
import { useRef } from "react";
import styled from "styled-components";

const Section = styled.section`
  width: 100vw;
  height: 100vh;
  position: relative;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;

  background-color: var(--white);
  overflow: hidden;
`;
const TextContainer = styled.p`
  width: 100%;
  height: 50vh;
  z-index: 1;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  color: var(--dark);

  span {
    font-size: var(--fontBig);
    width: 90%;
    font-weight: 600;
    text-transform: capitalize;
  }

  @media screen and (max-width: 70em) {
    span {
      font-size: var(--fontxxxl);
    }
  }
  @media screen and (max-width: 64em) {
    span {
      font-size: var(--fontxxl);
    }
  }
  @media screen and (max-width: 48em) {
    span {
      font-size: var(--fontlg);
    }
  }
`;
const TextContainer2 = styled.p`
  width: 100%;
  height: 50vh;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  color: var(--dark);

  span {
    font-size: var(--fontxxxl);
    width: 80%;
    font-weight: 600;
    text-transform: capitalize;
    align-self: flex-end;
    text-align: right;
  }

  @media screen and (max-width: 70em) {
    span {
      font-size: var(--fontxxl);
    }
  }
  @media screen and (max-width: 64em) {
    span {
      font-size: var(--fontxl);
    }
  }
  @media screen and (max-width: 48em) {
    span {
      font-size: var(--fontlg);
    }
  }
`;

const DesignSection = () => {
  const container = useRef(null);
  const textOne = useRef(null);
  const textTwo = useRef(null);

  useLayoutEffect(() => {
    let t1 = gsap
      .timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top-=500 top",
          end: "bottom top",
          scrub: 1,
        },
      })
      .fromTo(textOne.current, { x: 0 }, { x: "10%" }, "key1")
      .fromTo(textTwo.current, { x: 0 }, { x: "-10%" }, "key1");

    return () => {
      if (t1) t1.kill();
    };
  }, []);

  return (
    <Section ref={container}>
      <TextContainer ref={textOne}>
        <span>Flaw-less design with strong durability.</span>
      </TextContainer>

      <TextContainer2 ref={textTwo}>
        <span>Flat-edge design with toughest smartphone glass.</span>
      </TextContainer2>
    </Section>
  );
};

export default DesignSection;
