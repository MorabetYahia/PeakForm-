import { Stack } from 'expo-router';

export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="my-plan"
        options={{
          title: "My Plan",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="my_nutrition_plan"
        options={{
          title: "My Nutrition Plan",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clickableclient"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="editcustomFplan"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="editcustomNplan"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Chatcoach"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clickableoffre"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 