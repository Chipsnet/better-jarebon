import {
  Button,
  Container,
  RadioCard,
  NumberInput,
  Field,
  HStack,
  VStack,
  Heading,
  Show,
  IconButton,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LuArrowLeft } from "react-icons/lu";
import { api } from "~/lib/api";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<number>(6);
  const [charactersPerPage, setCharactersPerPage] = useState<number>(120);
  const [timeLimit, setTimeLimit] = useState<string>("disabled");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const { data } = await api.rooms.post({
      pages,
      charactersPerPage,
      timeLimit: timeLimit as "disabled" | "display" | "enabled",
      timeLimitSeconds:
        timeLimit === "display" || timeLimit === "enabled"
          ? timeLimitSeconds
          : undefined,
    });

    if (data) {
      navigate(`/room/${data.roomId}`);
    }
    setIsSubmitting(false);
  };

  return (
    <Container py={8}>
      <VStack gap={8} align="stretch">
        <HStack gap={4}>
          <IconButton asChild variant="ghost" size="lg">
            <Link to="/">
              <LuArrowLeft />
            </Link>
          </IconButton>
          <Heading size="2xl">部屋作成</Heading>
        </HStack>

        <Field.Root>
          <Field.Label>ページ数</Field.Label>
          <NumberInput.Root
            size="lg"
            value={pages.toString()}
            onValueChange={(e) => setPages(Number(e.value))}
            min={1}
            max={20}
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            1ゲームのページ数を設定します
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>文字数</Field.Label>
          <NumberInput.Root
            size="lg"
            value={charactersPerPage.toString()}
            onValueChange={(e) => setCharactersPerPage(Number(e.value))}
            min={50}
            max={500}
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            1ページあたりの最大文字数を設定します
          </Field.HelperText>
        </Field.Root>

        <RadioCard.Root
          value={timeLimit}
          onValueChange={(e) => {
            if (e.value) setTimeLimit(e.value);
          }}
        >
          <RadioCard.Label>時間制限</RadioCard.Label>
          <HStack align="stretch" gap={4}>
            <RadioCard.Item value="disabled">
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  <RadioCard.ItemText>無効</RadioCard.ItemText>
                  <RadioCard.ItemDescription>
                    時間制限はなく、タイマーも表示されません。
                  </RadioCard.ItemDescription>
                </RadioCard.ItemContent>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>

            <RadioCard.Item value="display">
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  <RadioCard.ItemText>表示</RadioCard.ItemText>
                  <RadioCard.ItemDescription>
                    タイマーを表示しますが、超過しても何も起こりません。
                  </RadioCard.ItemDescription>
                </RadioCard.ItemContent>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>

            <RadioCard.Item value="enabled">
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  <RadioCard.ItemText>有効</RadioCard.ItemText>
                  <RadioCard.ItemDescription>
                    タイマーを表示します。超過すると強制的に次のページへ進みます。
                  </RadioCard.ItemDescription>
                </RadioCard.ItemContent>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          </HStack>
        </RadioCard.Root>

        <Show when={timeLimit === "display" || timeLimit === "enabled"}>
          <Field.Root>
            <Field.Label>制限時間（秒）</Field.Label>
            <NumberInput.Root
              size="lg"
              value={timeLimitSeconds.toString()}
              onValueChange={(e) => setTimeLimitSeconds(Number(e.value))}
              min={10}
              max={600}
            >
              <NumberInput.Control />
              <NumberInput.Input />
            </NumberInput.Root>
            <Field.HelperText>
              1ページあたりの制限時間を秒単位で設定します
            </Field.HelperText>
          </Field.Root>
        </Show>

        <Button
          size="lg"
          colorPalette="blue"
          alignSelf="flex-start"
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          部屋を作る
        </Button>
      </VStack>
    </Container>
  );
}