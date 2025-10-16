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
} from "@chakra-ui/react";
import { useState } from "react";

export default function CreateRoomPage() {
  const [timeLimit, setTimeLimit] = useState<string>("disabled");

  return (
    <Container py={8}>
      <VStack gap={8} align="stretch">
        <Heading size="2xl">部屋作成</Heading>

        <Field.Root>
          <Field.Label>ページ数</Field.Label>
          <NumberInput.Root size="lg" defaultValue="6" min={1} max={20}>
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            1ゲームのページ数を設定します
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>文字数</Field.Label>
          <NumberInput.Root size="lg" defaultValue="120" min={50} max={500}>
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
            <NumberInput.Root size="lg" defaultValue="120" min={10} max={600}>
              <NumberInput.Control />
              <NumberInput.Input />
            </NumberInput.Root>
            <Field.HelperText>
              1ページあたりの制限時間を秒単位で設定します
            </Field.HelperText>
          </Field.Root>
        </Show>

        <Button size="lg" colorPalette="blue" alignSelf="flex-start">
          部屋を作る
        </Button>
      </VStack>
    </Container>
  );
}