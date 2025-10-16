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
  createdAt: Date;
};

type Participant = {
  id: number;
  roomId: string;
  playerName: string;
  isOwner: boolean;
  joinedAt: Date;
};

export default function RoomPage() {
  const { id } = useParams();
  const [playerName, setPlayerName] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<Participant | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "participants_update") {
          setParticipants(data.participants);
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
        
        // ルーム情報を再取得
        await fetchRoomData();
      } else {
        setError(data?.error || "参加に失敗しました");
      }
    } catch (err) {
      setError("参加に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = () => {
    // TODO: ゲーム開始処理を実装
    console.log("ゲームを開始します");
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