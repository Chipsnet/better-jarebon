import { Button, Container, RadioCard, NumberInput, Field, HStack } from "@chakra-ui/react";

export default function CreateRoomPage() {
    return <Container>
        <div>部屋作成ページ</div>
        <Field.Root>
            <Field.Label>ターン数</Field.Label>
            <NumberInput.Root size={"lg"} defaultValue="6" min={0}>
                <NumberInput.Control />
                <NumberInput.Input />
            </NumberInput.Root>
        </Field.Root>
        <Field.Root>
            <Field.Label>文字数</Field.Label>
            <NumberInput.Root size={"lg"} defaultValue="120" min={0}>
                <NumberInput.Control />
                <NumberInput.Input />
            </NumberInput.Root>
        </Field.Root>
        <RadioCard.Root>
            <RadioCard.Label>時間制限</RadioCard.Label>
            <HStack>
                <RadioCard.Item value="aaaa">
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
                <RadioCard.Item value="bbbb">
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
                <RadioCard.Item value="bbbb">
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
        <Button>部屋を作る</Button>
    </Container>;
}