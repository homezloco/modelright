import { CostCalculator } from '@/components/CostCalculator';

export const metadata = {
  title: 'AI Model Cost Calculator — modelright',
  description: 'Estimate monthly LLM API costs based on input tokens, output tokens, and call volumes.',
};

export default function CalculatorPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f8fafc' }}>
        AI Cost Calculator
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Calculate estimated API expenditures across token volumes and monthly request counts.
      </p>

      <CostCalculator initialInputPricePerM={2.50} initialOutputPricePerM={10.00} />
    </main>
  );
}
