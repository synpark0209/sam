export interface DialogueLine {
  speaker: string;
  text: string;
  speakerSide?: 'left' | 'right';
}

export interface DialogueEvent {
  lines: DialogueLine[];
}
