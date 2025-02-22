//
// Created by Guillermo Galvez on 21/02/2025.
//

#ifndef ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H
#define ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H

#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

#define ALPHABET_SIZE 27  // 26 letras de 'A' a 'Z' + 1 para '$'

// Función auxiliar para mapear un carácter a un índice
int getIndex(char c) {
    if (c == '$') return 26;
    return c - 'A';
}

// Estructura de Nodo del suffix tree
struct Node {
    int start;          // Índice de inicio del label en text
    int *end;           // Puntero al índice final (para hojas se comparte la variable global)
    int suffixIndex;    // Índice del sufijo (para hojas)
    Node* suffixLink;   // Enlace de sufijo (para optimizar la construcción)
    Node* children[ALPHABET_SIZE];  // Arreglo de punteros a hijos

    // Constructor
    Node(int start, int* end) : start(start), end(end), suffixIndex(0), suffixLink(nullptr) {
        for (int i = 0; i < ALPHABET_SIZE; i++)
            children[i] = nullptr;
    }

    // Calcula la longitud del borde (edge)
    int edgeLength() {
        return *end - start + 1;
    }

};

class SuffixTree {
private:
    // ========= Campos principales =========
    string text;           // Cadena de entrada (debe incluir '$' al final)
    Node* root;            // Nodo raíz
    Node* activeNode;      // Nodo activo
    int activeLength;      // Longitud activa
    char activeEdge;       // Carácter activo
    int remainingSuffixCount; // Número de sufijos pendientes de inserción
    int leafEnd;           // "end" global para las hojas
    Node* lastCreatedNode; // Último nodo interno creado

    // ========= Para el Algoritmo 10 (LRS) =========
    int maxDepth;          // Profundidad máxima encontrada para un substring repetido
    string bestString;     // Substring más largo repetido

    // ========= Para el Algoritmo 11 (SUS) =========
    int minLength;         // Longitud mínima de un substring único

public:
    // Constructor: se espera que 's' ya incluya el símbolo '$'
    SuffixTree(const string &s) : text(s), root(nullptr), activeNode(nullptr),
                                  activeLength(0), activeEdge('\0'), remainingSuffixCount(0),
                                  leafEnd(-1), lastCreatedNode(nullptr) {
        buildSuffixTree(); // Algoritmo 1: Construction(S)
        setSuffixIndexByDFS(root, 0); // Asigna suffixIndex a cada hoja mediante una DFS
    }

    // ======================= (A) Asignar suffixIndex a las hojas =======================
    // Se recorre el árbol en DFS y a cada hoja se le asigna suffixIndex = n - labelHeight
    // en base 0. Para nodos internos, se mantiene -1.
    void setSuffixIndexByDFS(Node* node, int labelHeight) {
        if (!node) return;
        bool isLeaf = true;
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr) {
                isLeaf = false;
                Node* child = node->children[i];
                // labelHeight + edgeLength del hijo
                setSuffixIndexByDFS(child, labelHeight + child->edgeLength());
            }
        }
        if (isLeaf) {
            // Para una cadena de longitud n, si la ruta hasta aquí mide labelHeight,
            // el sufijo correspondiente empieza en n - labelHeight (base 0).
            node->suffixIndex = (int)text.size() - labelHeight;
        }
    }

    // ======================= Algoritmo 1: Construction(S) =======================
    // Data: Una cadena S de longitud n.
    // Result: Un suffix tree T construido para S.
    void buildSuffixTree() {
        int n = text.size();
        int* rootEnd = new int(-1);
        root = new Node(-1, rootEnd);
        activeNode = root;
        activeEdge = '\0';
        activeLength = 0;
        remainingSuffixCount = 0;
        lastCreatedNode = nullptr;
        leafEnd = -1;
        // Para i ← 0 hasta n - 1
        for (int i = 0; i < n; i++) {
            extendSuffixTree(i); // Algoritmo 5: extendSuffixTree(i)
        }
    }

    // ======================= Algoritmo 2: walkDown(nextNode) =======================
    // Data: Un puntero a nodo nextNode.
    // Result: Si activeLength ≥ nextNode.edgeLength(), actualiza activePoint y retorna true.
    bool walkDown(Node* nextNode) {
        if (activeLength >= nextNode->edgeLength()) {
            // actualiza activeEdge: se toma el carácter en la nueva posición
            activeEdge = text[nextNode->start + activeLength];
            activeLength -= nextNode->edgeLength();
            activeNode = nextNode;
            return true;
        }
        return false;
    }

    // ---------------------- Algoritmo 3: createSuffixLink(node) ----------------------
    // Actualiza el suffix link del último nodo interno creado.
    // El parámetro 'setToNode' indica:
    //   - true: lastCreatedNode se actualiza a 'node'
    //   - false: se asigna el enlace y luego se resetea lastCreatedNode (se pone en nullptr)
    void createSuffixLink(Node *node, bool setToNode) {
        if (lastCreatedNode != nullptr) {
            lastCreatedNode->suffixLink = node;
        }
        if (setToNode)
            lastCreatedNode = node;
        else
            lastCreatedNode = nullptr;
    }


    // ======================= Algoritmo 4: splitEdge(nextNode, activeLength) =======================
    // Data: Nodo nextNode y la activeLength actual.
    // Result: Divide el borde en la posición indicada y retorna el nuevo nodo interno (splitNode).
    Node* splitEdge(Node* nextNode, int currentActiveLength) {
        int splitPosition = nextNode->start + currentActiveLength - 1;
        int* splitEnd = new int(splitPosition);
        Node* splitNode = new Node(nextNode->start, splitEnd);
        // Redirige activeNode.children[activeEdge] al splitNode
        activeNode->children[getIndex(activeEdge)] = splitNode;
        // Asigna nextNode como hijo de splitNode, usando el carácter siguiente del label
        splitNode->children[getIndex(text[splitPosition + 1])] = nextNode;
        nextNode->start = splitPosition + 1;
        return splitNode;
    }

    // ======================= Algoritmo 5: extendSuffixTree(i) =======================
    // Data: Índice actual i.
    // Result: Extiende el suffix tree con text[i].
    void extendSuffixTree(int i) {
        // end ← end + 1
        leafEnd = leafEnd + 1;
        // remainingSuffixCount ← remainingSuffixCount + 1
        remainingSuffixCount++;
        // lastCreatedNode ← null
        lastCreatedNode = nullptr;

        // Mientras queden sufijos pendientes de insertar
        while (remainingSuffixCount > 0) {
            // Si activeLength = 0, activeEdge ← text[i]
            if (activeLength == 0)
                activeEdge = text[i];

            // Índice para el hijo correspondiente a activeEdge
            int edgeIndex = getIndex(activeEdge);
            // Si activeNode no tiene hijo para activeEdge
            if (activeNode->children[edgeIndex] == nullptr) {
                // Crear nueva hoja con start = i y end = leafEnd
                Node* leaf = new Node(i, &leafEnd);
                activeNode->children[edgeIndex] = leaf;
                // Si lastCreatedNode ≠ null, asigna su suffixLink y luego lastCreatedNode ← null
                createSuffixLink(activeNode, false);
            }
            else {
                // Existe un hijo para activeEdge; asignar nextNode
                Node* nextNode = activeNode->children[edgeIndex];
                // Si activeLength ≥ nextNode.edgeLength(), se usa walkDown (Algoritmo 2)
                if (activeLength >= nextNode->edgeLength()) {
                    if (walkDown(nextNode))
                        continue;
                }
                // Si el carácter en nextNode coincide con text[i]
                if (text[nextNode->start + activeLength] == text[i]) {
                    activeLength = activeLength + 1;
                    // Si lastCreatedNode ≠ null, asigna su suffixLink
                    if (lastCreatedNode != nullptr)
                        lastCreatedNode->suffixLink = activeNode;
                    // Romper el while ya que no se requiere más extensión
                    break;
                }
                // Caso de discrepancia: dividir la arista (Algoritmo 4)
                Node* splitNode = splitEdge(nextNode, activeLength);
                // Crear nueva hoja para text[i] con start = i y end = leafEnd
                Node* leaf = new Node(i, &leafEnd);
                splitNode->children[getIndex(text[i])] = leaf;
                // Actualiza lastCreatedNode al nodo interno creado
                createSuffixLink(splitNode, true);
            }
            // remainingSuffixCount ← remainingSuffixCount - 1
            remainingSuffixCount = remainingSuffixCount - 1;

            // ======================= Algoritmo 6: setActivePoint(i) =======================
            if (activeNode == root && activeLength > 0) {
                activeLength = activeLength - 1;
                activeEdge = text[i - remainingSuffixCount + 1];
            }
            else if (activeNode != root) {
                // Si activeNode no es la raíz, se mueve al suffixLink del activeNode
                activeNode = (activeNode->suffixLink != nullptr) ? activeNode->suffixLink : root;
            }
        } // Fin del while
    }

    // Destructor: libera toda la memoria usada por el suffix tree
    ~SuffixTree() {
        destroyNode(root);  // Llama a la función recursiva para destruir el árbol (pseudocódigo: Destroy())
        root = nullptr;
    }

    // ======================= Algoritmo 7: destroyNode(i) =======================
    // Función recursiva que libera todos los nodos en postorden (pseudocódigo: destroyNode(v))
    void destroyNode(Node* v) {
        if (v == nullptr)
            return;
        // Recorrer cada hijo y destruirlo
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (v->children[i] != nullptr) {
                destroyNode(v->children[i]);
            }
        }
        // Si el puntero 'end' no es el de la variable global leafEnd, eliminarlo
        if (v->end != &leafEnd)
            delete v->end;
        delete v;
    }

    // ======================= Algoritmo 8: Search(P) =======================
    // Data: Suffix tree T construido a partir de la cadena text, y un patrón P.
    // Result: Retorna true si P existe en text, false en caso contrario.
    bool search(const string &pattern) {
        Node* v = root;  // v ← Root(T)
        int pos = 0;     // pos ← 0

        // Mientras queden caracteres en el patrón
        while (pos < pattern.size()) {
            char currentChar = pattern[pos];
            int idx = getIndex(currentChar);

            // Si v no tiene hijo con label que empiece con P[pos]
            if (v->children[idx] == nullptr)
                return false;  // return false

            // v ← v.child(P[pos])
            v = v->children[idx];

            // Se obtiene la longitud del label de la arista
            int edgeLen = v->edgeLength();
            // len ← min(|edge|, |P| - pos)
            int len = (edgeLen < (pattern.size() - pos)) ? edgeLen : (pattern.size() - pos);

            // Comparar caracter a caracter: si hay discrepancia, return false
            for (int i = 0; i < len; i++) {
                if (text[v->start + i] != pattern[pos + i])
                    return false;
            }
            pos += len;  // pos ← pos + len
        }
        return true;
    }

    // ======================= Algoritmo 9: FindAllMatches(P) =======================
    // Data: Un suffix tree T construido a partir de la cadena text (con '$' terminal)
    //       y un patrón P.
    // Result: Retorna un vector<int> con las posiciones en text donde P ocurre,
    //         usando siempre indexación base 0. (root tiene index 0)
    vector<int> findAllMatches(const string &pattern) {
        vector<int> matches;
        Node* v = root;
        int pos = 0;

        while (pos < (int) pattern.size()) {
            int idx = getIndex(pattern[pos]);
            if (v->children[idx] == nullptr)
                return matches; // No se encontró el patrón

            Node* child = v->children[idx];
            int edgeLen = child->edgeLength();
            int len = (edgeLen < (int) pattern.size() - pos) ? edgeLen : ((int) pattern.size() - pos);

            for (int i = 0; i < len; i++) {
                if (text[child->start + i] != pattern[pos + i])
                    return matches; // Discrepancia, patrón no existe
            }
            pos += len;
            v = child;
        }

        getLeafIndices(v, matches);

        sort(matches.begin(), matches.end());

        return matches;
    }


    // Método para recolectar los índices de las hojas a partir de un nodo dado.
    void getLeafIndices(Node* node, vector<int>& matches) {
        bool isLeaf = true;
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr) {
                isLeaf = false;
                getLeafIndices(node->children[i], matches);
            }
        }
        if (isLeaf) {
            // En una hoja, usamos suffixIndex, que contiene el índice correcto del sufijo.
            matches.push_back(node->suffixIndex);
        }
    }

    // ======================= Algoritmo 10: Longest Repeated Substring =======================
    string longestRepeatedSubstring() {
        maxDepth = 0;
        bestString.clear();
        lrsDFS(root, 0, "");
        return bestString;
    }

    // DFS auxiliar para LRS
    void lrsDFS(Node* node, int depth, const string &pathSoFar) {
        if (!node) return;

        // Contar cuántos hijos tiene el nodo
        int childCount = 0;
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr)
                childCount++;
        }

        // Si el nodo tiene >= 2 hijos, es un substring repetido
        if (childCount >= 2 && depth > maxDepth) {
            maxDepth = depth;
            bestString = pathSoFar;
        }

        // Recorrer hijos
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            Node* child = node->children[i];
            if (child != nullptr) {
                int length = child->edgeLength();
                // Concatena el label de la arista
                string edgeLabel = text.substr(child->start, length);
                lrsDFS(child, depth + length, pathSoFar + edgeLabel);
            }
        }
    }

    // ======================= Algoritmo 11: Shortest Unique Substring =======================

    // todo: Implementar el algoritmo 11

    // Función para imprimir las aristas del árbol
    void printEdges(Node *n, int height = 0) {
        if (n == nullptr)
            return;
        if (n->start != -1) {
            for (int i = 0; i < height; i++)
                cout << "    ";
            int len = (n->end ? n->edgeLength() : 0);
            cout << text.substr(n->start, len) << "\n";
        }
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (n->children[i] != nullptr)
                printEdges(n->children[i], height + 1);
        }
    }

    // Función para imprimir el árbol completo
    void printTree() {
        cout << "Suffix Tree:" << "\n";
        printEdges(root);
    }
};


#endif //ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H
