import { Box, Button, Center, Heading, HStack } from "@chakra-ui/react";

export default function TopPage() {
  return <Center h="100vh">
    <Box>
      <Center><Heading size={"3xl"}>Better Jarebon</Heading></Center>
      <HStack >
              <Button>部屋を作る</Button>
      <Button>部屋に入る</Button>
      </HStack >
    </Box>
  </Center>;
}