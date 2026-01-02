
import React from 'react';
import { LoadingStep } from './types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Trees, 
  CloudLightning, 
  Home, 
  Zap, 
  User, 
  ShieldAlert, 
  Search, 
  Activity,
  History,
  Info
} from 'lucide-react';

export const QUIZ_QUESTIONS = [
  {
    id: 'condition',
    question: "What’s the condition of your tree? 🌳",
    options: [
      { label: "Healthy, no visible issues", value: "healthy", icon: <CheckCircle2 className="text-emerald-500" /> },
      { label: "Some branches look weak", value: "weak-branches", icon: <AlertCircle className="text-amber-500" /> },
      { label: "Tree looks tilted or unstable", value: "unstable", icon: <ShieldAlert className="text-orange-500" /> },
      { label: "Storm damaged / Heavy weather", value: "storm-damaged", icon: <CloudLightning className="text-red-500" /> }
    ]
  },
  {
    id: 'location',
    question: "Where is your tree located? 🌍",
    options: [
      { label: "In my front yard", value: "front-yard", icon: <Trees className="text-blue-500" /> },
      { label: "In my backyard", value: "back-yard", icon: <Trees className="text-emerald-500" /> },
      { label: "Near house / Windows", value: "near-structure", icon: <Home className="text-slate-500" /> },
      { label: "Near power lines", value: "near-lines", icon: <Zap className="text-amber-400" /> }
    ]
  },
  {
    id: 'storms',
    question: "Recent storm exposure? ⛈️",
    options: [
      { label: "Yes, hit by recent storms", value: "yes", icon: <CloudLightning className="text-red-500" /> },
      { label: "No, weather's been calm", value: "no", icon: <Activity className="text-emerald-500" /> },
      { label: "I'm unsure", value: "unsure", icon: <Search className="text-slate-400" /> }
    ]
  },
  {
    id: 'cracks',
    question: "Visible cracks or decay? 🧐",
    options: [
      { label: "No cracks, looking good", value: "none", icon: <CheckCircle2 className="text-emerald-500" /> },
      { label: "Minor cracks / Scratches", value: "minor", icon: <Info className="text-amber-500" /> },
      { label: "Visible decay / Large cracks", value: "major", icon: <ShieldAlert className="text-red-600" /> },
      { label: "Unsure, need expert eyes", value: "unsure", icon: <Search className="text-blue-500" /> }
    ]
  },
  {
    id: 'age',
    question: "Rough age of the tree? ⏳",
    options: [
      { label: "Less than 5 years (Young)", value: "young", icon: <Activity className="text-emerald-400" /> },
      { label: "5-10 years (Mature)", value: "mature", icon: <Trees className="text-emerald-600" /> },
      { label: "Over 10 years (Heritage)", value: "old", icon: <History className="text-slate-600" /> }
    ]
  }
];

export const LOADING_STEPS: LoadingStep[] = [
  { id: 1, label: "Analyzing Your Responses", description: "Processing your tree assessment answers..." },
  { id: 2, label: "Calculating Risk Score", description: "Evaluating structural stability metrics..." },
  { id: 3, label: "Evaluating Local Climate Factors", description: "Checking weather patterns in your postcode area..." },
  { id: 4, label: "Preparing Your Report", description: "Tom is drafting your professional arborist note..." },
  { id: 5, label: "Finalizing Assessment", description: "Ensuring all recommendations are property-specific..." }
];

export const TREE_FACTS = [
  "Homeowners who get regular tree assessments save an average of $2,500 by catching structural rot early.",
  "Properly placed trees can reduce your property's cooling costs by up to 30% during summer months.",
  "Healthy mature trees can increase your overall property value by as much as 15% to 20%.",
  "A single mature tree can provide a day's supply of oxygen for up to four people.",
  "Tree-lined streets can be 5-10 degrees cooler than those without trees due to shade and transpiration."
];

export const TIPS = TREE_FACTS;
