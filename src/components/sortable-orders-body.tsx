"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { reorderOrders } from "@/app/(app)/admin/orders/actions";

type Item = { id: string; row: ReactNode };

/** Tbody s riadkami objednávok, ktoré sa dajú presúvať ťahaním za úchyt. Poradie sa uloží na server. */
export function SortableOrdersBody({ items }: { items: Item[] }) {
  const [ids, setIds] = useState(() => items.map((i) => i.id));
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const rowById = new Map(items.map((i) => [i.id, i.row]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setIds(next);
    startTransition(() => {
      reorderOrders(next);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <tbody>{ids.map((id) => rowById.get(id))}</tbody>
      </SortableContext>
    </DndContext>
  );
}
