import { Box, Button, Center, Heading, HStack } from "@chakra-ui/react";
import { Link } from "react-router";


export default function TopPage() {
  return <Center h="100vh">
    <Box>
      <Center><Heading size={"3xl"}>Better Jarebon</Heading></Center>
      <HStack >
        <Button asChild>
          <Link to="/create-room">部屋を作る</Link>
        </Button>
        <Button>部屋に入る</Button>
      </HStack >
    </Box>
  </Center>;
}