export type PublicUser = {
  id: number;
  username: string;
  displayName: string;
  avatarHue: number;
  bio?: string;
};

export type PostDTO = {
  id: number;
  content: string;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
};

export type CommentDTO = {
  id: number;
  content: string;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  likedByViewer: boolean;
};

export type ProfileDTO = PublicUser & {
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsViewer: boolean;
  isSelf: boolean;
};

export type ActivityDTO = {
  type: "like" | "comment" | "follow";
  actor: PublicUser;
  postId: number | null;
  snippet: string | null;
  createdAt: string;
};

export type FeedScope = "global" | "following";

export type ConnectionDTO = PublicUser & {
  bio: string;
  isFollowing: boolean;
};

export type UserCardDTO = PublicUser & {
  bio: string;
  followerCount: number;
  postCount: number;
  isFollowing: boolean;
};
