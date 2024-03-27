/*
  Every deck has an impact rating. By default these are set to
  1 (Noteworthy), sometimes you may want to add an unimportant
  event, current affairs article or a contemporary person

  Any deck with an impact of 2, 3 or 4 should be rendered
  with a star rating of between 1 and 3 stars. Treat these
  as Michelin stars rather than film review stars
 */

// used by ideas, people, timelines, events
//
export function impactAsText(impact: number): string {
    switch (impact) {
        case 0:
            return "Unimportant";
        case 1:
            return "Noteworthy";
        case 2:
            return "Important";
        case 3:
            return "World Changing";
        case 4:
            return "Humanity Changing";
        default:
            return "unknown impact value!!!!";
    }
}

// used by articles and dialogues
//
export function impactAsStarText(impact: number): string {
    switch (impact) {
        case 0:
            return "Unimportant";
        case 1:
            return "Normal";
        case 2:
            return "One Star";
        case 3:
            return "Two Stars";
        case 4:
            return "Three Stars";
        default:
            return "unknown impact value!!!!";
    }
}
