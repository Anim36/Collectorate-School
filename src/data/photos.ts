import type { SchoolPhoto } from "@/types/photo";

/**
 * Campus & community photography from the Figma design system
 * (node 2:159 – 2:165). Assets were downloaded into /public/images.
 */
export const schoolPhotos: readonly SchoolPhoto[] = [
  {
    id: "campus",
    src: "/images/campus.jpg",
    alt: "The school campus building on a bright morning",
    label: "Campus",
    width: 1376,
    height: 768,
  },
  {
    id: "head-of-institution",
    src: "/images/head-of-institution.jpg",
    alt: "Portrait of the head of institution",
    label: "Head of institution",
    width: 1024,
    height: 1024,
  },
  {
    id: "teacher",
    src: "/images/teacher.jpg",
    alt: "A teacher in front of the classroom whiteboard",
    label: "Teacher",
    width: 1024,
    height: 1024,
  },
  {
    id: "student",
    src: "/images/student.jpg",
    alt: "A student carrying books in the school corridor",
    label: "Student",
    width: 1024,
    height: 1024,
  },
  {
    id: "science-fair",
    src: "/images/science-fair.jpg",
    alt: "Students presenting a project at the science fair",
    label: "Science fair",
    width: 1024,
    height: 1024,
  },
  {
    id: "sports-day",
    src: "/images/sports-day.jpg",
    alt: "Students taking part in the annual sports day",
    label: "Sports day",
    width: 1024,
    height: 1024,
  },
];
