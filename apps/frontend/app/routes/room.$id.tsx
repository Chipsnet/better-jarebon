import {
  Button,
  Container,
  VStack,
  HStack,
  Heading,
  Input,
  Field,
  Card,
  Text,
  Badge,
  IconButton,
  Stack,
  Tabs,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { LuArrowLeft, LuUser, LuCrown } from "react-icons/lu";
import { api } from "~/lib/api";

type RoomData = {
  id: string;
  pages: number;
  charactersPerPage: number;
  timeLimit: string;
  timeLimitSeconds: number | null;
  status: string;
  currentRound: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

type Participant = {
  id: number;
  roomId: string;
  playerName: string;
  isOwner: boolean;
  joinedAt: Date;
};

type Title = {
  id: number;
  roomId: string;
  participantId: number;
  title: string;
  createdAt: Date;
};

type Page = {
  id: number;
  titleId: number;
  round: number;
  participantId: number;
  content: string;
  submittedAt: Date;
};

type GameState = {
  room: RoomData;
  participants: Participant[];
  titles: Title[];
  pages: Page[];
  assignments: Record<number, number | null>;
};

export default function RoomPage() {
  const { id } = useParams();
  const [playerName, setPlayerName] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<Participant | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [visiblePages, setVisiblePages] = useState<Record<number, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // 完成フェーズでの各タイトルの表示ページ数を初期化
  useEffect(() => {
    if (room?.status === "completed" && gameState) {
      const initialVisiblePages: Record<number, number> = {};
      gameState.titles.forEach(title => {
        if (visiblePages[title.id] === undefined) {
          initialVisiblePages[title.id] = 1;
        }
      });
      if (Object.keys(initialVisiblePages).length > 0) {
        setVisiblePages(prev => ({ ...prev, ...initialVisiblePages }));
      }
    }
  }, [room?.status, gameState?.titles.length]);

  useEffect(() => {
    if (!id) return;

    // LocalStorageから名前を取得
    const savedName = localStorage.getItem(`room_${id}_player_name`);
    if (savedName) {
      setPlayerName(savedName);
      // 自動的に参加を試みる
      handleJoinRoom(savedName);
    } else {
      // ルーム情報のみ取得
      fetchRoomData();
    }
  }, [id]);

  // WebSocket接続を管理
  useEffect(() => {
    if (!id || !currentPlayer) return;

    // WebSocket接続を確立
    const ws = new WebSocket(
      `ws://localhost:3000/ws/rooms/${id}?playerName=${encodeURIComponent(currentPlayer.playerName)}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      // 接続時にゲーム状態を取得
      fetchGameState();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "participants_update") {
          setParticipants(data.participants);
          // 参加者更新時もゲーム状態を取得
          fetchGameState();
        } else if (data.type === "room_state_update") {
          if (data.room) setRoom(data.room);
          if (data.participants) setParticipants(data.participants);
          // ゲーム状態を再取得
          fetchGameState();
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    wsRef.current = ws;

    // クリーンアップ
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [id, currentPlayer]);

  const fetchRoomData = async () => {
    if (!id) return;

    try {
      const { data } = await api.rooms({ id }).get();
      
      if (data && data.success && data.room && data.participants) {
        setRoom(data.room);
        setParticipants(data.participants);
      } else {
        setError("ルームが見つかりません");
      }
    } catch (err) {
      setError("ルーム情報の取得に失敗しました");
    }
  };

  const handleJoinRoom = async (name?: string) => {
    if (!id) return;
    
    const nameToUse = name || playerName;
    if (!nameToUse.trim()) {
      setError("名前を入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.rooms({ id }).join.post({
        playerName: nameToUse.trim(),
      });

      if (data && data.success && data.participant) {
        setCurrentPlayer(data.participant);
        localStorage.setItem(`room_${id}_player_name`, nameToUse.trim());
        
        // ルーム情報とゲーム状態を取得
        await fetchRoomData();
        // ゲーム状態も取得（進行中の場合に備えて）
        setTimeout(() => fetchGameState(), 500);
      } else {
        setError(data?.error || "参加に失敗しました");
      }
    } catch (err) {
      setError("参加に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGameState = async () => {
    if (!id) return;

    try {
      const { data } = await api.rooms({ id })["game-state"].get();
      
      if (data && data.success) {
        setGameState(data as any);
        if (data.room) setRoom(data.room);
        if (data.participants) setParticipants(data.participants);
      }
    } catch (err) {
      console.error("Failed to fetch game state:", err);
    }
  };

  const handleStartGame = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data } = await api.rooms({ id }).start.post();
      
      if (data && data.success) {
        await fetchGameState();
      } else {
        setError(data?.error || "ゲーム開始に失敗しました");
      }
    } catch (err) {
      setError("ゲーム開始に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTitle = async () => {
    if (!id || !currentPlayer || !titleInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.rooms({ id }).titles.post({
        participantId: currentPlayer.id,
        title: titleInput.trim(),
      });

      if (data && data.success) {
        setTitleInput("");
        await fetchGameState();
      } else {
        setError(data?.error || "タイトル提出に失敗しました");
      }
    } catch (err) {
      setError("タイトル提出に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPage = async () => {
    if (!id || !currentPlayer || !gameState || !pageContent.trim()) return;

    const myTitleId = gameState.assignments[currentPlayer.id];
    if (!myTitleId) {
      setError("担当するタイトルが見つかりません");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.rooms({ id }).pages.post({
        participantId: currentPlayer.id,
        titleId: myTitleId,
        content: pageContent.trim(),
      });

      if (data && data.success) {
        setPageContent("");
        await fetchGameState();
      } else {
        setError(data?.error || "ページ提出に失敗しました");
      }
    } catch (err) {
      setError("ページ提出に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !room) {
    return (
      <Container py={8}>
        <VStack gap={4}>
          <Text color="red.500">{error}</Text>
          <Button asChild>
            <Link to="/">トップに戻る</Link>
          </Button>
        </VStack>
      </Container>
    );
  }

  if (!currentPlayer) {
    return (
      <Container py={8}>
        <VStack gap={8} align="stretch">
          <HStack gap={4}>
            <IconButton asChild variant="ghost" size="lg">
              <Link to="/">
                <LuArrowLeft />
              </Link>
            </IconButton>
            <Heading size="2xl">ルーム参加</Heading>
          </HStack>

          {room && (
            <Card.Root>
              <Card.Body>
                <VStack align="start" gap={2}>
                  <Text fontWeight="bold">ルーム設定</Text>
                  <Text>ページ数: {room.pages}</Text>
                  <Text>文字数/ページ: {room.charactersPerPage}</Text>
                  <Text>
                    時間制限:{" "}
                    {room.timeLimit === "disabled"
                      ? "なし"
                      : room.timeLimit === "display"
                      ? `表示のみ (${room.timeLimitSeconds}秒)`
                      : `有効 (${room.timeLimitSeconds}秒)`}
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          <Field.Root invalid={!!error}>
            <Field.Label>プレイヤー名</Field.Label>
            <Input
              size="lg"
              placeholder="名前を入力してください"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleJoinRoom();
                }
              }}
              maxLength={20}
            />
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
            <Field.HelperText>
              同じ名前で再入場が可能です
            </Field.HelperText>
          </Field.Root>

          <Button
            size="lg"
            colorPalette="blue"
            onClick={() => handleJoinRoom()}
            loading={isLoading}
          >
            ルームに参加
          </Button>

          {participants.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">参加者 ({participants.length})</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={2}>
                  {participants.map((p) => (
                    <HStack key={p.id} gap={2}>
                      <LuUser />
                      <Text>{p.playerName}</Text>
                      {p.isOwner && (
                        <Badge colorPalette="yellow" variant="subtle">
                          <LuCrown /> オーナー
                        </Badge>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Container>
    );
  }

  // タイトル入力フェーズ
  if (currentPlayer && room?.status === "title_input") {
    const myTitle = gameState?.titles.find(t => t.participantId === currentPlayer.id);
    const submittedCount = gameState?.titles.length || 0;
    const totalCount = participants.length;

    return (
      <Container py={8}>
        <VStack gap={8} align="stretch">
          <HStack gap={4} justify="space-between">
            <Heading size="2xl">タイトル決定</Heading>
            <Badge colorPalette="blue" size="lg">
              {currentPlayer.playerName}
            </Badge>
          </HStack>

          <Card.Root>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                <Text fontWeight="bold">
                  提出状況: {submittedCount}/{totalCount}
                </Text>
                {myTitle ? (
                  <VStack align="stretch" gap={2}>
                    <Badge colorPalette="green" size="lg">
                      提出済み
                    </Badge>
                    <Text fontSize="lg">あなたのタイトル: {myTitle.title}</Text>
                    <Text color="gray.500" fontSize="sm">
                      他の参加者がタイトルを提出するまでお待ちください
                    </Text>
                  </VStack>
                ) : (
                  <VStack align="stretch" gap={4}>
                    <Field.Root invalid={!!error}>
                      <Field.Label>あなたのタイトルを入力してください</Field.Label>
                      <Input
                        size="lg"
                        placeholder="タイトルを入力"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        maxLength={100}
                      />
                      {error && <Field.ErrorText>{error}</Field.ErrorText>}
                    </Field.Root>
                    <Button
                      size="lg"
                      colorPalette="blue"
                      onClick={handleSubmitTitle}
                      loading={isLoading}
                      disabled={!titleInput.trim()}
                    >
                      タイトルを提出
                    </Button>
                  </VStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">参加者</Heading>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={2}>
                {participants.map((p) => {
                  const hasSubmitted = gameState?.titles.some(t => t.participantId === p.id);
                  return (
                    <HStack key={p.id} gap={2} justify="space-between">
                      <HStack gap={2}>
                        <LuUser />
                        <Text>{p.playerName}</Text>
                        {p.isOwner && (
                          <Badge colorPalette="yellow" variant="subtle" size="sm">
                            <LuCrown />
                          </Badge>
                        )}
                      </HStack>
                      {hasSubmitted && (
                        <Badge colorPalette="green" size="sm">完了</Badge>
                      )}
                    </HStack>
                  );
                })}
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    );
  }

  // ゲーム進行中フェーズ
  if (currentPlayer && room?.status === "in_progress" && gameState) {
    const myTitleId = gameState.assignments[currentPlayer.id];
    const myTitle = gameState.titles.find(t => t.id === myTitleId);
    const myPages = gameState.pages.filter(p => p.titleId === myTitleId).sort((a, b) => a.round - b.round);
    const hasSubmittedThisRound = gameState.pages.some(
      p => p.titleId === myTitleId && p.round === room.currentRound && p.participantId === currentPlayer.id
    );

    const submittedCount = gameState.pages.filter(p => p.round === room.currentRound).length;
    const totalTitles = gameState.titles.length;

    return (
      <Container py={8}>
        <VStack gap={8} align="stretch">
          <HStack gap={4} justify="space-between">
            <VStack align="start" gap={1}>
              <Heading size="2xl">ラウンド {room.currentRound}/{room.pages}</Heading>
              <Text color="gray.500">
                進行状況: {submittedCount}/{totalTitles} 提出済み
              </Text>
            </VStack>
            <Badge colorPalette="blue" size="lg">
              {currentPlayer.playerName}
            </Badge>
          </HStack>

          <Card.Root>
            <Card.Header>
              <Heading size="md">担当タイトル: {myTitle?.title}</Heading>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                {myPages.length > 0 && (
                  <VStack align="stretch" gap={2}>
                    <Text fontWeight="bold">直前のページ:</Text>
                    <Card.Root variant="outline">
                      <Card.Body>
                        <VStack align="stretch" gap={2}>
                          <Text fontSize="sm" color="gray.500">
                            ページ {myPages.length}
                          </Text>
                          <Text whiteSpace="pre-wrap">{myPages[myPages.length - 1].content}</Text>
                        </VStack>
                      </Card.Body>
                    </Card.Root>
                  </VStack>
                )}

                {hasSubmittedThisRound ? (
                  <VStack align="stretch" gap={2}>
                    <Badge colorPalette="green" size="lg">
                      提出済み
                    </Badge>
                    <Text color="gray.500">
                      他の参加者が提出するまでお待ちください
                    </Text>
                  </VStack>
                ) : (
                  <VStack align="stretch" gap={4}>
                    <Field.Root invalid={!!error}>
                      <Field.Label>
                        続きを書いてください（最大{room.charactersPerPage}文字）
                      </Field.Label>
                      <textarea
                        style={{
                          width: "100%",
                          minHeight: "200px",
                          padding: "0.75rem",
                          borderRadius: "0.375rem",
                          border: "1px solid var(--chakra-colors-gray-200)",
                          fontSize: "1rem",
                          fontFamily: "inherit",
                        }}
                        placeholder="内容を入力してください"
                        value={pageContent}
                        onChange={(e) => {
                          if (e.target.value.length <= room.charactersPerPage) {
                            setPageContent(e.target.value);
                          }
                        }}
                        maxLength={room.charactersPerPage}
                      />
                      <Text fontSize="sm" color="gray.500" textAlign="right">
                        {pageContent.length}/{room.charactersPerPage}
                      </Text>
                      {error && <Field.ErrorText>{error}</Field.ErrorText>}
                    </Field.Root>
                    <Button
                      size="lg"
                      colorPalette="blue"
                      onClick={handleSubmitPage}
                      loading={isLoading}
                      disabled={!pageContent.trim()}
                    >
                      ページを提出
                    </Button>
                  </VStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    );
  }

  // 完成フェーズ
  if (currentPlayer && room?.status === "completed" && gameState) {
    const showNextPage = (titleId: number) => {
      setVisiblePages(prev => ({
        ...prev,
        [titleId]: (prev[titleId] || 1) + 1
      }));
    };

    return (
      <Container py={8}>
        <VStack gap={8} align="stretch">
          <Heading size="2xl" textAlign="center">🎉 完成！</Heading>

          <Tabs.Root defaultValue={gameState.titles[0]?.id.toString()} size="lg">
            <Tabs.List>
              {gameState.titles.map((title) => (
                <Tabs.Trigger key={title.id} value={title.id.toString()}>
                  {title.title}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {gameState.titles.map((title) => {
              const titlePages = gameState.pages
                .filter(p => p.titleId === title.id)
                .sort((a, b) => a.round - b.round);
              const author = participants.find(p => p.id === title.participantId);
              const currentVisibleCount = visiblePages[title.id] || 1;
              const hasMorePages = currentVisibleCount < titlePages.length;

              return (
                <Tabs.Content key={title.id} value={title.id.toString()}>
                  <Card.Root>
                    <Card.Header>
                      <VStack align="start" gap={2}>
                        <Heading size="lg">{title.title}</Heading>
                        <Text fontSize="sm" color="gray.500">
                          タイトル考案者: {author?.playerName}
                        </Text>
                      </VStack>
                    </Card.Header>
                    <Card.Body>
                      <VStack align="stretch" gap={6}>
                        {titlePages.slice(0, currentVisibleCount).map((page) => {
                          const pageAuthor = participants.find(p => p.id === page.participantId);
                          return (
                            <VStack key={page.id} align="stretch" gap={3}>
                              <HStack gap={2} justify="flex-end">
                                <Text fontSize="sm" color="gray.500">
                                  執筆: {pageAuthor?.playerName}
                                </Text>
                              </HStack>
                              <Text whiteSpace="pre-wrap" fontSize="md" lineHeight="1.8">
                                {page.content}
                              </Text>
                              <div style={{
                                borderBottom: "2px solid var(--chakra-colors-gray-300)",
                                marginTop: "1rem"
                              }} />
                            </VStack>
                          );
                        })}
                        
                        {hasMorePages && (
                          <Button
                            size="lg"
                            colorPalette="blue"
                            variant="outline"
                            onClick={() => showNextPage(title.id)}
                          >
                            次のページを読む
                          </Button>
                        )}
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                </Tabs.Content>
              );
            })}
          </Tabs.Root>

          <Button asChild size="lg" colorPalette="blue">
            <Link to="/">新しいゲームを作る</Link>
          </Button>
        </VStack>
      </Container>
    );
  }

  // 待機フェーズ
  return (
    <Container py={8}>
      <VStack gap={8} align="stretch">
        <HStack gap={4} justify="space-between">
          <HStack gap={4}>
            <IconButton asChild variant="ghost" size="lg">
              <Link to="/">
                <LuArrowLeft />
              </Link>
            </IconButton>
            <Heading size="2xl">ルーム</Heading>
          </HStack>
          <Badge colorPalette="blue" size="lg">
            {currentPlayer.playerName}
            {currentPlayer.isOwner && " (オーナー)"}
          </Badge>
        </HStack>

        {room && (
          <Card.Root>
            <Card.Header>
              <Heading size="md">ルーム設定</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap={2}>
                <Text>ページ数: {room.pages}</Text>
                <Text>文字数/ページ: {room.charactersPerPage}</Text>
                <Text>
                  時間制限:{" "}
                  {room.timeLimit === "disabled"
                    ? "なし"
                    : room.timeLimit === "display"
                    ? `表示のみ (${room.timeLimitSeconds}秒)`
                    : `有効 (${room.timeLimitSeconds}秒)`}
                </Text>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}

        <Card.Root>
          <Card.Header>
            <Heading size="md">参加者 ({participants.length})</Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={2}>
              {participants.map((p) => (
                <HStack key={p.id} gap={2}>
                  <LuUser />
                  <Text fontWeight={p.id === currentPlayer.id ? "bold" : "normal"}>
                    {p.playerName}
                    {p.id === currentPlayer.id && " (あなた)"}
                  </Text>
                  {p.isOwner && (
                    <Badge colorPalette="yellow" variant="subtle">
                      <LuCrown /> オーナー
                    </Badge>
                  )}
                </HStack>
              ))}
            </VStack>
          </Card.Body>
        </Card.Root>

        {currentPlayer.isOwner && (
          <Button
            size="lg"
            colorPalette="green"
            onClick={handleStartGame}
          >
            ゲームを開始
          </Button>
        )}
      </VStack>
    </Container>
  );
}