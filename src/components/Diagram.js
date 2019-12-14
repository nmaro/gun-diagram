import React, { useState, useRef, useEffect } from "react";
import { getId } from "nicks-gun-utils";
import TextareaAutosize from "react-textarea-autosize";

export const Diagram = ({
  diagram,
  onSetTitle,
  onCreateItem,
  onSetItemName,
  onMoveItem,
  onDeleteItem,
  onAddRelationship
}) => {
  const [ctrl, setCtrl] = useState();
  const [pointer, setPointer] = useState();
  const [moving, setMoving] = useState();
  const [editing, setEditing] = useState();
  const [origin, setOrigin] = useState([0, 0]);
  const [editTitle, setEditTitle] = useState(false);
  const ref = useRef(null);
  const title = useRef(null);
  useEffect(() => {
    const keyDownHandler = window.addEventListener("keydown", e => {
      if (e.key === "Control") {
        setCtrl(true);
      }
    });

    const keyUpHandler = window.addEventListener("keyup", e => {
      if (e.key === "Control") {
        setCtrl(false);
      }
    });

    return () => {
      window.removeEventListener("keydown", keyDownHandler);
      window.removeEventListener("keyup", keyUpHandler);
    };
  }, []);
  return (
    <>
      {editTitle ? (
        <form
          style={{
            position: "absolute"
          }}
          onSubmit={e => {
            e.preventDefault();
            onSetTitle(title.current.value);
            setEditTitle(false);
          }}
        >
          <input autoFocus ref={title} defaultValue={diagram.title} />
        </form>
      ) : (
        <h1 onDoubleClick={() => setEditTitle(true)}>
          {diagram.title || "untitled"}
        </h1>
      )}
      <div
        className={`diagram ${ctrl ? "ctrl" : ""} ${
          moving && !moving[0] ? "moving" : ""
        }`}
        ref={ref}
        onDoubleClick={e => {
          const [x, y] = getPointerPos(ref.current, e);
          const id = onCreateItem(x - origin[0], y - origin[1]);
          setEditing(id);
        }}
        onMouseDown={e => {
          setMoving([null, pointer]);
          setEditing();
        }}
        onMouseUp={e => {
          if (moving) {
            const [item, originalPointer] = moving;
            if (item) {
              if (!ctrl) {
                onMoveItem(
                  getId(item),
                  snap(item.x + pointer[0] - originalPointer[0]),
                  snap(item.y + pointer[1] - originalPointer[1])
                );
              } else {
                const destination = diagram.items.find(item =>
                  contains(item, pointer, ctrl, moving, pointer, origin)
                );
                if (destination && destination !== item) {
                  onAddRelationship(item, destination);
                }
              }
            } else {
              setOrigin([
                origin[0] + pointer[0] - originalPointer[0],
                origin[1] + pointer[1] - originalPointer[1]
              ]);
            }
            setMoving();
          }
        }}
        onMouseMove={e => setPointer(getPointerPos(ref.current, e))}
      >
        <svg>
          <defs>
            <marker
              id="markerArrow"
              markerWidth="13"
              markerHeight="13"
              refX="10"
              refY="6"
              orient="auto"
              fill="black"
            >
              <path d="M2,2 L2,11 L10,6 L2,2" />
            </marker>
          </defs>
          {ctrl && moving && moving[0] && (
            <DrawingArrow
              moving={moving}
              destination={diagram.items.find(item =>
                contains(item, pointer, ctrl, moving, pointer, origin)
              )}
              end={pointer}
              origin={origin}
            />
          )}
          {diagram.items.map(item => (
            <React.Fragment key={getId(item)}>
              {item.relationships.map(destination => (
                <RelationshipArrow
                  key={getId(destination)}
                  moving={moving}
                  source={item}
                  destination={destination}
                  ctrl={ctrl}
                  moving={moving}
                  pointer={pointer}
                  origin={origin}
                />
              ))}
            </React.Fragment>
          ))}
          {diagram.items.map(item => (
            <Item
              item={item}
              onSetItemName={onSetItemName}
              onDeleteItem={onDeleteItem}
              moving={moving}
              pointer={pointer}
              ctrl={ctrl}
              setMoving={setMoving}
              origin={origin}
            />
          ))}
        </svg>
        {diagram.items.map(item => (
          <ItemText
            key={getId(item)}
            item={item}
            onSetItemName={onSetItemName}
            onDeleteItem={onDeleteItem}
            moving={moving}
            pointer={pointer}
            ctrl={ctrl}
            setMoving={setMoving}
            editing={editing}
            setEditing={setEditing}
            origin={origin}
          />
        ))}
        <div className="info">
          <ul>
            <li>New item: doube click</li>
            <li>Edit: double click</li>
            <li>Stop editing: esc or ctrl + enter</li>
            <li>Arrow: control + drag from item to item</li>
            <li>Move view: drag</li>
          </ul>
        </div>
      </div>
    </>
  );
};

const Item = ({ item, moving, pointer, ctrl, origin }) => {
  let [x, y, width, height] = getRect(item, ctrl, moving, pointer, origin);
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d={`M0,0 L${width},0 L${width},${height} L0,${height} Z`}
        fill="#357BD2"
      ></path>
    </g>
  );
};

const ItemText = ({
  item,
  onSetItemName,
  onDeleteItem,
  setMoving,
  setEditing,
  editing,
  moving,
  pointer,
  ctrl,
  origin
}) => {
  const id = getId(item);
  const [x, y, width, height] = getRect(item, ctrl, moving, pointer, origin);
  const name = item.name || "";
  const ref = useRef(null);

  return (
    <div
      onDoubleClick={e => {
        e.stopPropagation();
        if (editing === id) {
          setEditing();
        } else {
          setEditing(id);
        }
      }}
      className={`item`}
      onMouseDown={e => {
        e.stopPropagation();
        setMoving([item, pointer]);
      }}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${x}px,${y}px)`
      }}
    >
      {editing === id ? (
        <TextareaAutosize
          inputRef={ref}
          autoFocus
          onKeyDown={e => {
            e.stopPropagation();
            switch (e.key) {
              case "Backspace":
                if (!name) {
                  onDeleteItem(id);
                }
                break;
              case "Escape":
                if (!name) {
                  onDeleteItem(id);
                } else {
                  setEditing();
                }
                break;
              case "Enter":
                if (e.ctrlKey) {
                  setEditing();
                }
                break;
            }
          }}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => onSetItemName(getId(item), e.target.value)}
          value={name}
        />
      ) : (
        <div className="text">{name}</div>
      )}
    </div>
  );
};

const DrawingArrow = ({ moving: [startItem], destination, end, origin }) => {
  if (contains(startItem, end, undefined, undefined, undefined, origin)) {
    return null;
  }

  return (
    <Arrow
      start={
        getKnob(
          startItem,
          destination
            ? getCenter(destination, undefined, undefined, undefined, origin)
            : end,
          undefined,
          undefined,
          undefined,
          origin
        )[0]
      }
      end={
        destination
          ? getKnob(
              destination,
              getCenter(startItem, undefined, undefined, undefined, origin),
              undefined,
              undefined,
              undefined,
              origin
            )[0]
          : end
      }
    />
  );
};

const RelationshipArrow = ({
  source,
  destination,
  ctrl,
  moving,
  pointer,
  origin
}) => {
  return (
    <Arrow
      start={
        getKnob(
          source,
          getCenter(destination, ctrl, moving, pointer, origin),
          ctrl,
          moving,
          pointer,
          origin
        )[0]
      }
      end={
        getKnob(
          destination,
          getCenter(source, ctrl, moving, pointer, origin),
          ctrl,
          moving,
          pointer,
          origin
        )[0]
      }
    />
  );
};

const Arrow = ({ start, end }) => {
  return (
    <line
      x1={start[0]}
      y1={start[1]}
      x2={end[0]}
      y2={end[1]}
      stroke="black"
      strokeWidth="2"
      markerEnd="url(#markerArrow)"
    />
  );
};

const getKnob = (item, [ex, ey], ctrl, moving, pointer, origin) => {
  const [x, y, width, height] = getRect(item, ctrl, moving, pointer, origin);
  if (x + width < ex) {
    if (y + height < ey) {
      if (ex - (x + width) >= ey - (y + height)) {
        return [[x + width, y + height / 2], "h"];
      } else {
        return [[x + width / 2, y + height], "w"];
      }
    } else {
      if (ex - (x + width) >= y - ey) {
        return [[x + width, y + height / 2], "h"];
      } else {
        return [[x + width / 2, y], "w"];
      }
    }
  } else {
    if (y + height < ey) {
      if (x - ex >= ey - (y + height)) {
        return [[x, y + height / 2], "h"];
      } else {
        return [[x + width / 2, y + height], "w"];
      }
    } else {
      if (x - ex >= y - ey) {
        return [[x, y + height / 2], "h"];
      } else {
        return [[x + width / 2, y], "w"];
      }
    }
  }
};

const getRect = (item, ctrl, moving, pointer, origin) => {
  let [x, y, w, h] = [
    item.x || 0,
    item.y || 0,
    item.width || 120,
    item.height || 50
  ];
  const id = getId(item);
  if (!ctrl && moving && moving[0] && getId(moving[0]) === id) {
    x = snap(x + pointer[0] - moving[1][0]);
    y = snap(y + pointer[1] - moving[1][1]);
  }
  if (moving && !moving[0]) {
    x += pointer[0] - moving[1][0];
    y += pointer[1] - moving[1][1];
  }
  return [origin[0] + x, origin[1] + y, w, h];
};

const getCenter = (item, ctrl, moving, pointer, origin) => {
  const [x, y, w, h] = getRect(item, ctrl, moving, pointer, origin);
  return [x + w / 2, y + h / 2];
};

const contains = (item, [px, py], ctrl, moving, pointer, origin) => {
  const [x, y, width, height] = getRect(item, ctrl, moving, pointer, origin);
  return x <= px && px <= x + width && y <= py && py <= y + height;
};

const getPointerPos = (ref, e) => {
  const rect = ref.getBoundingClientRect();

  // use cursor pos as default
  let clientX = e.clientX;
  let clientY = e.clientY;

  // use first touch if available
  if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  // return mouse/touch position inside canvas
  return [clientX - rect.left, clientY - rect.top];
};

const GRID = 10;

const snap = x => Math.floor(x / GRID) * GRID;
