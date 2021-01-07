import React, { useEffect } from "react";
import { animated, useTransition } from "react-spring";
import SOCKET_EVENT from "../../../../../shared/src/socketEvent";
import Card from "../../../components/Card";
import NOTI_VARIANT from "../../../constants/NOTI_VARIANT";
import socket from "../../../global/socket";
import ICard from "../../../interfaces/ICard";
import useNotificationState from "../../../state/notificationState";
import { useChosenCardState, useCurrentPlayerState } from "../state";
import "./PlayerHand.scss";

const PlayerHand = (): JSX.Element => {
  const { chosenCard, chooseCard } = useChosenCardState();
  const currentPlayer = useCurrentPlayerState();
  const setNotification = useNotificationState().set;
  const [hand, setHand] = React.useState<ICard[]>([]);

  const transitions = useTransition(hand, (card) => card.id, {
    from: {
      position: "relative",
      transform: "translateY(40px)",
      opacity: 0.5,
    },
    enter: {
      transform: "translateY(0px)",
      scale: 1,
      opacity: 1,
    },
    leave: {
      opacity: 0,
    },
  });

  const playCard = (id: string): void => {
    // TODO check if in-turn
    if (chosenCard !== id) chooseCard(id);
    else if (currentPlayer === socket.id) {
      socket.emit(SOCKET_EVENT.PlayCard, id);
      socket.once(SOCKET_EVENT.CardPlayed, () => {
        setHand(hand.filter((c) => c.id !== id));
      });
    } else {
      setNotification({
        message: "Not your turn!",
        variant: NOTI_VARIANT.Error,
        show: true,
      });
    }
  };

  useEffect(() => {
    socket.on(SOCKET_EVENT.TakeCard, (cards: ICard[]) => setHand((list) => [...list, ...cards]));

    return (): void => {
      console.log("off");
      socket.off(SOCKET_EVENT.TakeCard);
    };
  }, []);

  return (
    <>
      <div className="player-hand">
        {transitions.map(({ item, key, props }) => (
          <animated.div key={key} style={props}>
            <Card card={item} onChoose={() => playCard(item.id)} isChosen={chosenCard === item.id} />
          </animated.div>
        ))}
      </div>
    </>
  );
};

export default PlayerHand;
