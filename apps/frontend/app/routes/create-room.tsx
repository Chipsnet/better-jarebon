import {
  Button,
  Container,
  RadioCard,
  NumberInput,
  Field,
  HStack,
  VStack,
  Heading,
} from "@chakra-ui/react";

export default function CreateRoomPage() {
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

        <RadioCard.Root defaultValue="disabled">
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

        <Button size="lg" colorPalette="blue" alignSelf="flex-start">
          部屋を作る
        </Button>
      </VStack>
    </Container>
  );
}