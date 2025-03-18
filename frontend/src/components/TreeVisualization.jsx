import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import axios from "axios";
import * as THREE from "three";

const Node = ({ position, depth }) => {
  const meshRef = useRef();
  
  // Simple animation: scale effect
  useFrame(() => {
    meshRef.current.scale.setScalar(1 + 0.1 * Math.sin(Date.now() * 0.002));
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color={depth === 0 ? "red" : "blue"} />
    </mesh>
  );
};

const TreeVisualization = () => {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDerivationTree();
  }, []);

  const fetchDerivationTree = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/get-grammar");
      setTreeData(response.data);
      console.log("Tree Data:", response.data);
    } catch (error) {
      console.error("Error fetching tree:", error);
    }
    setLoading(false);
  };

  const renderTree = (data, parentPosition = new THREE.Vector3(0, 0, 0), depth = 0) => {
    if (!data || Object.keys(data).length === 0) return null;

    return Object.entries(data).map(([key, values], index) => {
      const angle = (index / Object.entries(data).length) * Math.PI * 2;
      const position = new THREE.Vector3(
        parentPosition.x + Math.cos(angle) * 2,
        parentPosition.y - 2,
        parentPosition.z + Math.sin(angle) * 2
      );

      return (
        <group key={key}>
          <Node position={position} depth={depth} />
          <line>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  parentPosition.x, parentPosition.y, parentPosition.z,
                  position.x, position.y, position.z,
                ])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial attach="material" color="white" />
          </line>
          {values.map((child, childIndex) =>
            renderTree({ [child]: [] }, position, depth + 1)
          )}
        </group>
      );
    });
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {loading && <p>Loading derivation tree...</p>}
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        {treeData && renderTree(treeData)}
      </Canvas>
    </div>
  );
};

export default TreeVisualization;