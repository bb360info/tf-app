
import { calculateReadiness, getReadinessStatus, getReadinessColor } from '../src/lib/readiness/calculator';
import { CheckinData } from '../src/lib/readiness/types';

const testCases: { name: string; data: CheckinData; expectedRange: [number, number] }[] = [
    {
        name: 'Perfect Day',
        data: { sleepDuration: 9, sleepQuality: 5, soreness: 0, mood: 5 },
        expectedRange: [99, 100]
    },
    {
        name: 'Average Day',
        data: { sleepDuration: 7, sleepQuality: 3, soreness: 5, mood: 3 },
        expectedRange: [50, 70]
    },
    {
        name: 'Terrible Day',
        data: { sleepDuration: 4, sleepQuality: 1, soreness: 9, mood: 1 },
        expectedRange: [0, 40]
    },
    {
        name: 'High Pain but Good Sleep',
        data: { sleepDuration: 9, sleepQuality: 5, soreness: 8, mood: 3 },
        expectedRange: [60, 80]
    }
];

function runTests() {
    console.log('🧪 Testing Readiness Calculator...\n');
    let passed = 0;

    for (const test of testCases) {
        const score = calculateReadiness(test.data);
        const status = getReadinessStatus(score);
        const color = getReadinessColor(score);

        const success = score >= test.expectedRange[0] && score <= test.expectedRange[1];

        console.log(`Test: ${test.name}`);
        console.log(`Input: Sleep ${test.data.sleepDuration}h (Q${test.data.sleepQuality}), Pain ${test.data.soreness}, Mood ${test.data.mood}`);
        console.log(`Result: Score ${score} (${status}) - Color: ${color}`);

        if (success) {
            console.log('✅ PASS\n');
            passed++;
        } else {
            console.error(`❌ FAIL: Expected range [${test.expectedRange.join('-')}]\n`);
        }
    }

    if (passed === testCases.length) {
        console.log('🎉 All tests passed!');
    } else {
        console.error(`⚠️ ${testCases.length - passed} tests failed.`);
        process.exit(1);
    }
}

runTests();
