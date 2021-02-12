import React, { useEffect, useState } from "react";
import Transition, { TransitionStatus } from "react-transition-group/Transition";
import ANIMATION_DURATION from "../../../../../../shared/src/AnimationDuration";
import SOCKET_EVENT from "../../../../../../shared/src/SocketEvent";
import Card from "../../../../components/Card";
import ICard from "../../../../interfaces/ICard";
import socket from "../../../../services/socket";
import BoxOfCard from "./BoxOfCard";
import ChargePointBar from "./ChargePointBar";
import "./GameBoard.scss";

const defaultStyle: React.CSSProperties = {
  transition: "opacity 300ms, bottom 300ms",
};

const transitionStyles: Record<TransitionStatus, React.CSSProperties> = {
  entering: {
    opacity: 1,
    bottom: "5%",
  },
  entered: {
    opacity: 1,
    bottom: "5%",
  },
  exiting: {
    opacity: 0,
    bottom: "10%",
  },
  exited: {
    opacity: 0,
    bottom: "0%",
  },
  unmounted: {},
};

const GameBoard = (): JSX.Element => {
  const [playedCard, setPlayedCard] = useState<ICard>();
  const [shouldCosumeAnimationPlay, setShouldCosumeAnimationPlay] = useState(false);

  const showPlayedCard = (card: ICard): void => {
    setPlayedCard(card);
    setShouldCosumeAnimationPlay(true);
    setTimeout(() => setShouldCosumeAnimationPlay(false), ANIMATION_DURATION.ConsumeCard);
  };

  useEffect(() => {
    socket.on(SOCKET_EVENT.CardPlayed, showPlayedCard);

    return (): void => {
      console.log("off");
      socket.off(SOCKET_EVENT.CardPlayed);
    };
  }, []);

  return (
    <div className="game-board">
      <BoxOfCard />
      <ChargePointBar />
      <Transition in={shouldCosumeAnimationPlay} timeout={300}>
        {(state) => (
          <div
            className="game-board__played-card"
            style={{
              ...defaultStyle,
              ...transitionStyles[state],
            }}
          >
            {!!playedCard && <Card card={playedCard} />}
          </div>
        )}
      </Transition>
    </div>
  );
};

export default GameBoard;
