export interface GuideSection {
  id: string;
  title: string;
  content: string; // HTML content string
}

export interface GuideChapter {
  id: string;
  number: number;
  title: string;
  icon: string;
  summary: string;
  sections: GuideSection[];
}

export interface GuideData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  chapters: GuideChapter[];
}
