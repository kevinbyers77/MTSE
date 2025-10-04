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
    
    // Calculate models using ALL data
    const x = Array.from({ length: n }, (_, idx) => idx + 1);
    const y = evidences;
    
    // Average Model: Simply returns the mean
    const avgValue = evidences.reduce((a, b) => a + b, 0) / n;
    const avgPredicted = evidences.map(() => avgValue);

    // Linear Model: y = mx + b (least squares regression) - use ALL data
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

    // Power Law Model: y = a * x^b (log transformation) - use ALL data
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

    // Calculate deltas (absolute differences)
    const avgDeltas = evidences.map((obs, i) => Math.abs(obs - avgPredicted[i]));
    const linearDeltas = evidences.map((obs, i) => Math.abs(obs - linearPredicted[i]));
    const powerLawDeltas = evidences.map((obs, i) => Math.abs(obs - powerLawPredicted[i]));

    const avgTotalDelta = avgDeltas.reduce((a, b) => a + b, 0);
    const linearTotalDelta = linearDeltas.reduce((a, b) => a + b, 0);
    const powerLawTotalDelta = powerLawDeltas.reduce((a, b) => a + b, 0);

    const avgAvgDelta = avgTotalDelta / n;
    const linearAvgDelta = linearTotalDelta / n;
    const powerLawAvgDelta = powerLawTotalDelta / n;

    // Determine best model (lowest average delta)
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

  // Prepare chart data
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
    
    console.log('Chart Data:', data);
    return data;
  }, [evidences, calculations]);

  const currentTrendScore = calculations 
    ? calculations[calculations.bestModel.toLowerCase().replace(' ', '').replace('law', 'Law')].predicted[evidences.length - 1]
    : 0;

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
                {evidences.length >= 3 ? currentTrendScore.toFixed(1) : '—'}
              </div>
              {calculations && (
                <div className="text-xs text-green-600 font-semibold mt-1">
                  {calculations.bestModel} Model
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidence Input */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
          <label className="text-sm font-semibold text-gray-700">Add Evidence Score (1-4):</label>
          <input
            type="number"
            min="1"
            max="4"
            value={currentScore}
            onChange={(e) => setCurrentScore(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addEvidence()}
            className="w-20 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
            placeholder="1-4"
          />
          <button
            onClick={addEvidence}
            disabled={!currentScore || parseInt(currentScore) < 1 || parseInt(currentScore) > 4}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            <Plus size={18} /> Add Evidence
          </button>
          {evidences.length > 0 && (
            <button
              onClick={removeLastEvidence}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform hover:scale-105"
            >
              <Trash2 size={18} /> Remove Last
            </button>
          )}
          <div className="ml-auto text-sm text-gray-600">
            Evidences: <span className="font-bold text-blue-600">{evidences.length}</span>
            {evidences.length < 3 && <span className="text-orange-600 ml-2">(Need 3+ to predict)</span>}
          </div>
        </div>

        {evidences.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-semibold text-gray-700 mb-2">Entered Scores:</div>
            <div className="flex flex-wrap gap-2">
              {evidences.map((score, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg font-semibold shadow-md transform transition-all hover:scale-110"
                >
                  #{index + 1}: {score}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Selection Display */}
      {calculations && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Prediction Models</h2>
            <div className="group relative">
              <Info size={18} className="text-blue-500 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 w-80 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-10">
                The model with the lowest Average Δ (prediction error) is automatically selected as the most reliable.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['average', 'linear', 'powerLaw'].map((model) => {
              const modelName = model === 'powerLaw' ? 'Power Law' : model.charAt(0).toUpperCase() + model.slice(1);
              const isSelected = calculations.bestModel === modelName;
              const data = calculations[model];
              
              return (
                <div
                  key={model}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">{modelName}</h3>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={18} />
                        <span className="text-xs font-semibold">Best</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Score:</span>
                      <span className="font-bold text-blue-600">{data.predicted[evidences.length - 1].toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Δ:</span>
                      <span className="font-semibold text-gray-800">{data.totalDelta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Δ:</span>
                      <span className="font-semibold text-orange-600">{data.avgDelta.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {evidences.length > 0 && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Trend Visualization</h2>
            <div className="group relative">
              <Info size={18} className="text-blue-500 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 w-80 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-10">
                Gray dots show observed scores. Colored lines show each model's predictions. The best-fit model appears in green.
              </div>
            </div>
          </div>
          
          {calculations && (
            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-500"></div>
                <span>Linear (Solid)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-pink-500" style={{backgroundImage: 'repeating-linear-gradient(90deg, #ec4899 0, #ec4899 4px, transparent 4px, transparent 8px)'}}></div>
                <span>Average (Dashed)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-orange-500" style={{backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 2px, transparent 2px, transparent 4px)'}}></div>
                <span>Power Law (Dotted)</span>
              </div>
            </div>
          )}
          
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="assessment" 
                label={{ value: 'Assessment', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                domain={[0, 5]} 
                label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '2px solid #3b82f6', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              
              <Line dataKey="observed" stroke="#6b7280" strokeWidth={0} dot={{ fill: '#6b7280', r: 6 }} name="Observed" />
              
              {calculations && chartData.length >= 3 && (
                <>
                  <Line 
                    dataKey="linear" 
                    stroke={calculations.bestModel === 'Linear' ? '#22c55e' : '#3b82f6'} 
                    strokeWidth={calculations.bestModel === 'Linear' ? 4 : 3}
                    name="Linear"
                    dot={false}
                  />
                  <Line 
                    dataKey="average" 
                    stroke={calculations.bestModel === 'Average' ? '#22c55e' : '#ec4899'} 
                    strokeWidth={calculations.bestModel === 'Average' ? 4 : 3}
                    strokeDasharray="8 4"
                    name="Average"
                    dot={false}
                  />
                  <Line 
                    dataKey="powerLaw" 
                    stroke={calculations.bestModel === 'Power Law' ? '#22c55e' : '#f97316'} 
                    strokeWidth={calculations.bestModel === 'Power Law' ? 4 : 3}
                    strokeDasharray="3 3"
                    name="Power Law"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      {calculations && (
        <div className="bg-white rounded-lg p-6 shadow-md overflow-x-auto">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Detailed Calculations</h2>
            <div className="group relative">
              <Info size={18} className="text-blue-500 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 w-96 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-10">
                Predicted: What the model thinks the score should be<br/>
                Δ from Observed: Absolute difference between predicted and actual (lower is better)<br/>
                Total Δ: Sum of all errors<br/>
                Average Δ: Mean error (determines best model)
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-2 text-left">Assessment</th>
                {evidences.map((_, index) => (
                  <th key={index} className="p-2 text-center">{index + 1}</th>
                ))}
                <th className="p-2 text-center">Total Δ</th>
                <th className="p-2 text-center">Average Δ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-100 font-semibold">
                <td className="p-2">Observed Score</td>
                {evidences.map((score, index) => (
                  <td key={index} className="p-2 text-center">{score}</td>
                ))}
                <td className="p-2"></td>
                <td className="p-2"></td>
              </tr>
              
              {['average', 'linear', 'powerLaw'].map((model) => {
                const modelName = model === 'powerLaw' ? 'Power Law' : model.charAt(0).toUpperCase() + model.slice(1);
                const isSelected = calculations.bestModel === modelName;
                const data = calculations[model];
                
                return (
                  <React.Fragment key={model}>
                    <tr className={isSelected ? 'bg-green-50' : 'bg-blue-50'}>
                      <td className="p-2 font-semibold" rowSpan="2">
                        {modelName}
                        {isSelected && <Check size={14} className="inline ml-2 text-green-600" />}
                      </td>
                      {data.predicted.map((pred, index) => (
                        <td key={index} className="p-2 text-center text-xs">{pred.toFixed(2)}</td>
                      ))}
                      <td className="p-2 text-center font-semibold" rowSpan="2">{data.totalDelta.toFixed(2)}</td>
                      <td className="p-2 text-center font-semibold" rowSpan="2">{data.avgDelta.toFixed(3)}</td>
                    </tr>
                    <tr className={isSelected ? 'bg-green-100' : 'bg-blue-100'}>
                      {data.deltas.map((delta, index) => (
                        <td key={index} className="p-2 text-center text-xs text-orange-600 font-semibold">
                          {delta.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {evidences.length === 0 && (
        <div className="bg-white rounded-lg p-12 shadow-md text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Evidences Yet</h3>
          <p className="text-gray-600">Add your first assessment score above to get started!</p>
        </div>
      )}

      {evidences.length > 0 && evidences.length < 3 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mt-6 text-center">
          <div className="text-4xl mb-2">⏳</div>
          <h3 className="text-lg font-bold text-yellow-800 mb-2">
            {3 - evidences.length} more evidence{3 - evidences.length !== 1 ? 's' : ''} needed
          </h3>
          <p className="text-yellow-700">Trend predictions require at least 3 assessment scores</p>
        </div>
      )}
    </div>
  );
};

export default PLPTrendCalculator;
