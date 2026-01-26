/// <reference types="vite/client" />

declare module 'react-beautiful-dnd' {
  export interface DraggableProvided {
    innerRef: any;
    draggableProps: any;
    dragHandleProps: any;
  }

  export interface DraggableStateSnapshot {
    isDragging: boolean;
    draggingOver?: string;
  }

  export interface DroppableProvided {
    innerRef: any;
    droppableProps: any;
    placeholder?: React.ReactElement;
  }

  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith?: string;
  }

  export interface DropResult {
    source: {
      droppableId: string;
      index: number;
    };
    destination?: {
      droppableId: string;
      index: number;
    };
    reason: 'DROP' | 'CANCEL';
    type: string;
  }

  export const DragDropContext: any;
  export const Droppable: any;
  export const Draggable: any;
}
