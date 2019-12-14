import { Diagram } from "./Diagram";
import React, { useState, useEffect } from "react";
import { getPub, useGun, getUUID, getSet, getId } from "nicks-gun-utils";

const Gun = require("gun/gun");
require("gun/sea");
require("gun/lib/radix");
require("gun/lib/radisk");
require("gun/lib/store");
require("gun/lib/rindexed");

export const GunDiagram = ({ id, priv, epriv }) => {
  const [gun, setGun] = useState(null);
  const pub = getPub(id);
  const pair = pub && priv && { pub, priv, epriv };
  const [data, onData, put] = useGun(Gun, gun, useState, pair);

  useEffect(() => {
    const gun = Gun({
      localStorage: false,
      peers: ["https://gunjs.herokuapp.com/gun", "http://nmr.io:8765/gun"]
    });
    gun.get(id).on(onData);
    gun
      .get(`${id}.items`)
      .on(onData)
      .map()
      .on(onData)
      .once(item => gun.get(`${getId(item)}.relationships`).on(onData));
    setGun(gun);
  }, []);

  if (!gun) {
    return <div>Loading...</div>;
  }

  const diagram = {
    ...data[id],
    items: getSet(data, `${id}.items`).map(item => ({
      ...item,
      relationships: getSet(data, `${getId(item)}.relationships`)
    }))
  };

  return (
    <Diagram
      diagram={diagram}
      onCreateItem={(x, y) => {
        const key = getUUID(gun);
        const itemId = `${id}.items.${key}`;
        put(
          [itemId, "x", x],
          [itemId, "y", y],
          [`${id}.items`, key, { "#": itemId }]
        );

        return itemId;
      }}
      onAddRelationship={(source, destination) =>
        put(
          [
            `${getId(source)}.relationships`,
            getKey(getId(destination)),
            {
              "#": getId(destination)
            }
          ],
          [id, "updated", +new Date()],
          [id, "lastUpdate", `"${source.name}" -> "${destination.name}"`]
        )
      }
      onSetTitle={title => put([id, "title", title])}
      onMoveItem={(itemId, x, y) => put([itemId, "x", x], [itemId, "y", y])}
      onSetItemName={(itemId, name) =>
        put(
          [itemId, "name", name],
          [id, "updated", +new Date()],
          [id, "lastUpdate", name]
        )
      }
      onDeleteItem={itemId => put([`${id}.items`, getKey(itemId), null])}
    />
  );
};

const getKey = id => /[^\.]+$/.exec(id)[0];
