import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, Plus, Trash2, Check } from 'lucide-react';

const PLPTrendCalculator = () => {
  const [evidences, setEvidences] = useState([]);
  const [currentScore, setCurrentScore] = useState('');

  // Add a new evidence
  const addEvidence = () => {
    const score = parseInt(currentScore);
    if (score >= 1 && score <= 4) {
      setEvidences([...evidences, score]);
      setCurrentScore('');
    }
  };

  // Remove last evidence
  const removeLastEvidence = () => {
    setEvidences(evidences.slice(0, -1));
  };

  // Calculate predictions for each model
  const calculations = useMemo(() => {
    if (evidences.length < 3) return null;

    const n = evidences.length;
    const x = Array.from({ length: n }, (_, idx) => idx + 1);
    const y = evidences;

    // Average model
    const avgValue = evidences.reduce((a, b) => a + b, 0) / n;
    const avgPredicted = evidences.map(() => avgValue);

    // Linear model
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, idx) => sum + xi * y[idx], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    const linearPredicted = x.map(xi => {
      const result = slope * xi + intercept;
      return isNaN(result) || !isFinite(result) ? avgValue : result;
    });

    // Power Law model
    const logX = x.map(val => Math.log(val));
    const logY = y.map(val => Math.log(Math.max(val, 0.1)));

    const sumLogX = logX.reduce((a, b) => a + b, 0);
    const sumLogY = logY.reduce((a, b) => a + b, 0);
    const sumLogXLogY = logX.reduce((sum, lx, idx) => sum + lx * logY[idx], 0);
    const sumLogX2 = logX.reduce((sum, lx) => sum + lx * lx, 0);

    const denominatorPL = n * sumLogX2 - sumLogX * sumLogX;
    const b = denominatorPL !== 0 ? (n * sumLogXLogY - sumLogX * sumLogY) / denominatorPL : 0;
    const logA = (sumLogY - b * sumLogX) / n;
    const a = Math.exp(logA);

    const powerLawPredicted = x.map(xi => {
      const result = a * Math.pow(xi, b);
      return isNaN(result) || !isFinite(result) ? avgValue : result;
    });

    // Deltas
    const avgDeltas = evidences.map((obs, i) => Math.abs(obs - avgPredicted[i]));
    const linearDeltas = evidences.map((obs, i) => Math.abs(obs - linearPredicted[i]));
    const powerLawDeltas = evidences.map((obs, i) => Math.abs(obs - powerLawPredicted[i]));

    const avgTotalDelta = avgDeltas.reduce((a, b) => a + b, 0);
    const linearTotalDelta = linearDeltas.reduce((a, b) => a + b, 0);
    const powerLawTotalDelta = powerLawDeltas.reduce((a, b) => a + b, 0);

    const avgAvgDelta = avgTotalDelta / n;
    const linearAvgDelta = linearTotalDelta / n;
    const powerLawAvgDelta = powerLawTotalDelta / n;

    const deltas = [
      { name: 'Average', value: avgAvgDelta },
      { name: 'Linear', value: linearAvgDelta },
      { name: 'Power Law', value: powerLawAvgDelta }
    ];
    const bestModel = deltas.reduce((min, curr) => curr.value < min.value ? curr : min).name;

    return {
      average: { predicted: avgPredicted, deltas: avgDeltas, totalDelta: avgTotalDelta, avgDelta: avgAvgDelta },
      linear: { predicted: linearPredicted, deltas: linearDeltas, totalDelta: linearTotalDelta, avgDelta: linearAvgDelta },
      powerLaw: { predicted: powerLawPredicted, deltas: powerLawDeltas, totalDelta: powerLawTotalDelta, avgDelta: powerLawAvgDelta },
      bestModel
    };
  }, [evidences]);

  // Chart data
  const chartData = useMemo(() => {
    const data = evidences.map((score, index) => {
      const dataPoint = {
        assessment: index + 1,
        observed: score,
        date: new Date(2023, 0, (index + 1) * 30).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
      };

      if (calculations && calculations.average.predicted[index] !== undefined) {
        dataPoint.average = calculations.average.predicted[index];
        dataPoint.linear = calculations.linear.predicted[index];
        dataPoint.powerLaw = calculations.powerLaw.predicted[index];
      }
      return dataPoint;
    });
    return data;
  }, [evidences, calculations]);

  // Current trend score (rounded to nearest 0.5)
  const currentTrendScore = calculations 
    ? calculations[calculations.bestModel.toLowerCase().replace(' ', '').replace('law', 'Law')].predicted[evidences.length - 1]
    : 0;
  const roundedTrendScore = Math.round(currentTrendScore * 2) / 2;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg">
      <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Trend Score Calculator</h1>
            <p className="text-gray-600">Enter assessment scores to see how trend predictions work</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Current Trend Score</div>
              <div className="text-4xl font-bold text-blue-600">
                {evidences.length >= 3 ? roundedTrendScore.toFixed(1) : '—'}
              </div>
              {calculations && (
                <div className="text-xs text-green-600 font-semibold mt-1">
                  {calculations.bestModel} Model
                </div>
              )}
            </div>
          </div>
        </div>
